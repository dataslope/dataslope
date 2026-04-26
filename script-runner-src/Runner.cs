using System;
using System.IO;
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;

namespace ScriptRunner;

public partial class Runner
{
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
            var options = ScriptOptions.Default
                .WithImports(
                    "System",
                    "System.Collections.Generic",
                    "System.Linq",
                    "System.Text",
                    "System.Threading.Tasks",
                    "System.IO"
                );

            await CSharpScript.RunAsync(code, options);
        }
        catch (CompilationErrorException ex)
        {
            foreach (var diag in ex.Diagnostics)
                stderr.AppendLine(diag.ToString());
            exitCode = 1;
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
}
