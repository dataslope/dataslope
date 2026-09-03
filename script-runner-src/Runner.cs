using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Reflection;
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Text;

namespace ScriptRunner;

public partial class Runner
{
    private static MetadataReference[]? cachedReferences;

    [JSImport("getDotnetBundleBaseUrl", "main.js")]
    internal static partial string GetDotnetBundleBaseUrl();

    [JSExport]
    [return: JSMarshalAs<JSType.Promise<JSType.String>>]
    public static Task<string> RunScript(string code)
    {
        return RunScriptInternalAsync(code);
    }

    private static async Task<string> RunScriptInternalAsync(string code)
    {
        var stdout = new StringBuilder();
        var stderr = new StringBuilder();
        int exitCode = 0;

        var originalOut = Console.Out;
        var originalError = Console.Error;

        Console.SetOut(new StringWriter(stdout));
        Console.SetError(new StringWriter(stderr));

        try
        {
            var references = await GetMetadataReferencesAsync();
            var options = new CSharpCompilationOptions(OutputKind.ConsoleApplication)
                .WithConcurrentBuild(false)
                .WithUsings(
                    "System",
                    "System.Collections.Generic",
                    "System.Linq",
                    "System.Text",
                    "System.Threading.Tasks",
                    "System.IO"
                );

            var syntaxTree = CSharpSyntaxTree.ParseText(
                DefaultUsings + code,
                CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.Latest)
            );
            var compilation = CSharpCompilation.Create(
                $"Playground_{Guid.NewGuid():N}",
                new[] { syntaxTree },
                references,
                options
            );

            using var peStream = new MemoryStream();
            var emitResult = compilation.Emit(peStream);
            if (!emitResult.Success)
            {
                foreach (var diag in emitResult.Diagnostics.Where(d => d.Severity == DiagnosticSeverity.Error))
                    stderr.AppendLine(diag.ToString());
                exitCode = 1;
            }
            else
            {
                peStream.Position = 0;
                var assembly = Assembly.Load(peStream.ToArray());
                // Roslyn's sync EntryPoint wrapper blocks on the async body,
                // which throws "Cannot wait on monitors on this runtime" on
                // single-threaded WASM — prefer the async `<Main>$` and await it.
                var asyncEntry = assembly.GetTypes()
                    .SelectMany(t => t.GetMethods(
                        BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic))
                    .FirstOrDefault(m => m.Name == "<Main>$"
                        && typeof(Task).IsAssignableFrom(m.ReturnType));
                var entryPoint = asyncEntry ?? assembly.EntryPoint;
                if (entryPoint != null)
                {
                    var args = entryPoint.GetParameters().Length == 0 ? null : new object[] { Array.Empty<string>() };
                    var result = entryPoint.Invoke(null, args);
                    if (result is Task task)
                    {
                        await task;
                        var resultProperty = task.GetType().GetProperty("Result");
                        if (resultProperty?.GetValue(task) is int taskExitCode)
                            exitCode = taskExitCode;
                    }
                    else if (result is int intExitCode)
                    {
                        exitCode = intExitCode;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            stderr.AppendLine(ex.Message);
            if (ex.InnerException != null)
                stderr.AppendLine(ex.InnerException.Message);
            exitCode = 1;
        }
        finally
        {
            Console.SetOut(originalOut);
            Console.SetError(originalError);
        }

        return JsonSerializer.Serialize(new
        {
            stdout = stdout.ToString(),
            stderr = stderr.ToString(),
            exitCode
        });
    }

    /// <summary>
    /// Completions at <paramref name="position"/> (a 0-based offset into
    /// <paramref name="code"/>) from Roslyn's semantic model, no
    /// Workspaces/Features assemblies needed: <c>LookupSymbols</c> at the
    /// cursor, or on the receiver's type after a <c>.</c>. Returns JSON
    /// <c>{ "items": [{label, type, detail}], "replaceLength": n }</c>;
    /// <c>{ "error": "…" }</c> when the compilation itself failed.
    /// <paramref name="otherFilesJson"/> is a JSON object of path → source
    /// for the rest of the workspace, or empty.
    /// </summary>
    [JSExport]
    [return: JSMarshalAs<JSType.Promise<JSType.String>>]
    public static Task<string> Complete(string code, int position, string otherFilesJson)
    {
        return CompleteInternalAsync(code, position, otherFilesJson);
    }

    private static async Task<string> CompleteInternalAsync(string code, int position, string otherFilesJson)
    {
        try
        {
            var references = await GetMetadataReferencesAsync();
            var parseOptions = CSharpParseOptions.Default.WithLanguageVersion(LanguageVersion.Latest);
            var text = DefaultUsings + code;
            var offset = DefaultUsings.Length + Math.Clamp(position, 0, code.Length);
            var tree = CSharpSyntaxTree.ParseText(text, parseOptions, path: "Program.cs");
            var trees = new List<SyntaxTree> { tree };
            if (!string.IsNullOrWhiteSpace(otherFilesJson))
            {
                var others = JsonSerializer.Deserialize<Dictionary<string, string>>(otherFilesJson);
                if (others != null)
                {
                    foreach (var (path, source) in others)
                        trees.Add(CSharpSyntaxTree.ParseText(source, parseOptions, path: path));
                }
            }
            var options = new CSharpCompilationOptions(OutputKind.ConsoleApplication)
                .WithConcurrentBuild(false);
            var compilation = CSharpCompilation.Create(
                $"Completion_{Guid.NewGuid():N}", trees, references, options);
            var model = compilation.GetSemanticModel(tree);

            // The identifier being typed, if any: what the popup replaces.
            int start = offset;
            while (start > 0 && (char.IsLetterOrDigit(text[start - 1]) || text[start - 1] == '_'))
                start--;
            var replaceLength = offset - start;
            var typed = text.Substring(start, replaceLength);
            var hidePrivate = !typed.StartsWith("_");

            IEnumerable<ISymbol> symbols;
            bool? wantStatic = null;
            if (start > 0 && text[start - 1] == '.')
            {
                var root = await tree.GetRootAsync();
                var dotPosition = start - 1;
                var node = root.FindToken(dotPosition).Parent;
                ExpressionSyntax? receiver = null;
                for (var n = node; n != null && receiver == null; n = n.Parent)
                {
                    if (n is MemberAccessExpressionSyntax ma && ma.OperatorToken.SpanStart == dotPosition)
                        receiver = ma.Expression;
                    else if (n is QualifiedNameSyntax qn && qn.DotToken.SpanStart == dotPosition)
                        receiver = qn.Left;
                    else if (n is MemberBindingExpressionSyntax)
                        break;
                }
                if (receiver == null)
                    return JsonSerializer.Serialize(new { items = Array.Empty<object>(), replaceLength });

                var symbolInfo = model.GetSymbolInfo(receiver);
                var typeInfo = model.GetTypeInfo(receiver);
                if (symbolInfo.Symbol is INamespaceSymbol ns)
                {
                    symbols = model.LookupNamespacesAndTypes(offset, ns);
                }
                else if (symbolInfo.Symbol is ITypeSymbol typeAsReceiver && typeInfo.Type == null)
                {
                    symbols = model.LookupSymbols(offset, typeAsReceiver, includeReducedExtensionMethods: false);
                    wantStatic = true;
                }
                else if (typeInfo.Type != null)
                {
                    symbols = model.LookupSymbols(offset, typeInfo.Type, includeReducedExtensionMethods: true);
                    wantStatic = false;
                }
                else
                {
                    symbols = Array.Empty<ISymbol>();
                }
            }
            else
            {
                symbols = model.LookupSymbols(offset);
            }

            var items = new List<object>();
            var seen = new Dictionary<string, int>();
            var format = SymbolDisplayFormat.MinimallyQualifiedFormat
                .WithMemberOptions(SymbolDisplayMemberOptions.IncludeParameters | SymbolDisplayMemberOptions.IncludeType)
                .WithParameterOptions(SymbolDisplayParameterOptions.IncludeType | SymbolDisplayParameterOptions.IncludeName | SymbolDisplayParameterOptions.IncludeParamsRefOut | SymbolDisplayParameterOptions.IncludeDefaultValue);
            var ordered = new List<(string name, string kind, string detail)>();
            foreach (var symbol in symbols)
            {
                var name = symbol.Name;
                if (string.IsNullOrEmpty(name) || name.StartsWith("<") || name.StartsWith("op_") || name == ".ctor" || name == ".cctor")
                    continue;
                if (hidePrivate && name.StartsWith("_"))
                    continue;
                if (wantStatic.HasValue)
                {
                    // Static access through the type name lists statics and
                    // nested types; instance access lists instance members.
                    var isStaticLike = symbol.IsStatic || symbol is INamedTypeSymbol;
                    if (wantStatic.Value != isStaticLike)
                        continue;
                }
                if (seen.TryGetValue(name, out var count))
                {
                    seen[name] = count + 1;
                    continue;
                }
                seen[name] = 0;
                var kind = symbol switch
                {
                    IMethodSymbol => "method",
                    IPropertySymbol => "property",
                    IFieldSymbol f => f.IsConst ? "constant" : "variable",
                    ILocalSymbol or IParameterSymbol or IRangeVariableSymbol => "variable",
                    IEventSymbol => "property",
                    INamedTypeSymbol t => t.TypeKind switch
                    {
                        TypeKind.Interface => "interface",
                        TypeKind.Enum => "enum",
                        TypeKind.Struct => "type",
                        TypeKind.Delegate => "type",
                        _ => "class",
                    },
                    ITypeParameterSymbol => "type",
                    INamespaceSymbol => "namespace",
                    _ => "variable",
                };
                string detail;
                try
                {
                    detail = symbol.ToMinimalDisplayString(model, offset, format);
                    if (detail.StartsWith(name)) detail = detail.Substring(name.Length);
                }
                catch
                {
                    detail = "";
                }
                ordered.Add((name, kind, detail));
            }
            foreach (var (name, kind, detail) in ordered)
            {
                var extra = seen[name];
                var shown = extra > 0 ? $"{detail} (+{extra} overload{(extra > 1 ? "s" : "")})".Trim() : detail;
                items.Add(new { label = name, type = kind, detail = shown });
                if (items.Count >= 300) break;
            }
            return JsonSerializer.Serialize(new { items, replaceLength });
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { error = ex.Message });
        }
    }

    private static async Task<MetadataReference[]> GetMetadataReferencesAsync()
    {
        if (cachedReferences != null)
            return cachedReferences;

        using var http = new HttpClient { BaseAddress = new Uri(GetDotnetBundleBaseUrl()) };
        var references = new List<MetadataReference>();
        var assemblyNames = AppDomain.CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic)
            .Select(assembly => assembly.GetName().Name)
            .Where(name => !string.IsNullOrEmpty(name) && IsSafeAssemblyName(name))
            // Advertised in the Packages drawer but not yet loaded into the
            // AppDomain at first compile, so user code (BigInteger, Regex, ...)
            // would fail CS0246. The DLLs already ship in the boot bundle.
            .Concat(new[]
            {
                "System.Runtime.Numerics",
                "System.Numerics.Vectors",
                "System.Text.RegularExpressions",
            })
            .Distinct()
            .OrderBy(name => name);

        foreach (var name in assemblyNames)
        {
            try
            {
                var bytes = await http.GetByteArrayAsync($"{name}.dll");
                references.Add(MetadataReference.CreateFromImage(bytes));
            }
            catch
            {
                // Some runtime-generated assemblies have no matching file in
                // the CDN bundle; Roslyn only needs the ones we can load.
            }
        }

        cachedReferences = references.ToArray();
        return cachedReferences;
    }

    private static bool IsSafeAssemblyName(string name)
    {
        return name.All(c => char.IsLetterOrDigit(c) || c == '.' || c == '_' || c == '-');
    }

    private const string DefaultUsings = """
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.IO;

""";
}
