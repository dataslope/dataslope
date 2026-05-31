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
                // For top-level statements that use `await`, Roslyn makes the
                // public EntryPoint a synchronous wrapper that blocks on the
                // async body via `.GetAwaiter().GetResult()`. That blocking
                // wait throws "Cannot wait on monitors on this runtime" on the
                // single-threaded WASM interpreter, so prefer the generated
                // async entry point (`<Main>$`) and await it instead.
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

    private static async Task<MetadataReference[]> GetMetadataReferencesAsync()
    {
        if (cachedReferences != null)
            return cachedReferences;

        EnsureBclAssembliesLoaded();

        using var http = new HttpClient { BaseAddress = new Uri(GetDotnetBundleBaseUrl()) };
        var references = new List<MetadataReference>();
        var assemblyNames = AppDomain.CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic)
            .Select(assembly => assembly.GetName().Name)
            .Where(name => !string.IsNullOrEmpty(name) && IsSafeAssemblyName(name))
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

    // Force-load BCL assemblies that the Packages drawer advertises but that
    // Runner.cs itself never references (System.Numerics, RegularExpressions).
    // Without this they're absent from AppDomain.CurrentDomain.GetAssemblies()
    // and never become Roslyn metadata references, so user code using
    // BigInteger, Complex or Regex fails to compile (CS0246) even with the
    // correct `using`. These DLLs already ship in the boot bundle
    // (dotnet.boot.js), so touching them adds no extra download.
    private static void EnsureBclAssembliesLoaded()
    {
        _ = typeof(System.Numerics.BigInteger);
        _ = typeof(System.Numerics.Complex);
        _ = typeof(System.Text.RegularExpressions.Regex);
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
