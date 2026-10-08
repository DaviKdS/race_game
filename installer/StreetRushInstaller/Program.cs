using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;

const string appFolderName = "Street Rush";
const string payloadName = "StreetRushPayload.zip";

var targetDir = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
    appFolderName);
var tempZip = Path.Combine(Path.GetTempPath(), payloadName);

Directory.CreateDirectory(targetDir);

var assembly = Assembly.GetExecutingAssembly();
var resourceName = assembly
    .GetManifestResourceNames()
    .FirstOrDefault(name => name.EndsWith(payloadName, StringComparison.OrdinalIgnoreCase));

await using (var resource = resourceName is null ? null : assembly.GetManifestResourceStream(resourceName))
{
    if (resource is null)
    {
        MessageBox("Instalador invalido: pacote do jogo nao foi encontrado.");
        return 1;
    }

    await using var output = File.Create(tempZip);
    await resource.CopyToAsync(output);
}

ZipFile.ExtractToDirectory(tempZip, targetDir, overwriteFiles: true);
File.Delete(tempZip);

var exePath = Path.Combine(targetDir, "StreetRush.exe");
if (!File.Exists(exePath))
{
    MessageBox("Instalacao concluida, mas o executavel do jogo nao foi encontrado.");
    return 1;
}

Process.Start(new ProcessStartInfo
{
    FileName = exePath,
    UseShellExecute = true,
    WorkingDirectory = targetDir
});

MessageBox($"Street Rush instalado em:\n{targetDir}");
return 0;

static void MessageBox(string message)
{
    Process.Start(new ProcessStartInfo
    {
        FileName = "powershell",
        Arguments = $"-NoProfile -Command \"Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('{Escape(message)}', 'Street Rush')\"",
        UseShellExecute = false,
        CreateNoWindow = true
    })?.WaitForExit();
}

static string Escape(string value)
{
    return value.Replace("\\", "\\\\").Replace("'", "''").Replace("\r", "").Replace("\n", "\\n");
}
