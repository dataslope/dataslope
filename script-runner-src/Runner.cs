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

    [JSImport("getOrigin", "main.js")]
    internal static partial string GetOrigin();

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
                var entryPoint = assembly.EntryPoint;
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

        using var http = new HttpClient { BaseAddress = new Uri(GetOrigin()) };
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
                var bytes = await http.GetByteArrayAsync($"/_dotnet/{name}.dll");
                references.Add(MetadataReference.CreateFromImage(bytes));
            }
            catch
            {
                // Some runtime-generated assemblies have no matching file in
                // the shipped bundle; Roslyn only needs the ones we can load.
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
