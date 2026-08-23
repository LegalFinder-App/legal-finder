Add-Type -AssemblyName System.Security
$code = @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class CredMan {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob; public int Persist;
    public int AttributeCount; public IntPtr Attributes; public string TargetAlias; public string UserName;
  }
  [DllImport("advapi32", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);
  [DllImport("advapi32", SetLastError=true)]
  public static extern bool CredFree(IntPtr cred);
}
'@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
$ptr = [IntPtr]::Zero
if (-not [CredMan]::CredRead('Supabase CLI:supabase', 1, 0, [ref]$ptr)) {
  Write-Error 'CRED_READ_FAILED'
  exit 1
}
$cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
$bytes = New-Object byte[] $cred.CredentialBlobSize
[Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
$token = [Text.Encoding]::ASCII.GetString($bytes)
[CredMan]::CredFree($ptr) | Out-Null
Set-Content -Path $args[0] -Value $token -NoNewline
