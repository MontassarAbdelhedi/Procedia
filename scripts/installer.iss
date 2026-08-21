; Procedia Windows Installer — Inno Setup 6+
; Per-user install, no admin required.
;
; BEFORE BUILDING:
;   1. npm run build           (produces build/)
;   2. Verify version in #define MyAppVersion matches CSXS/manifest.xml
;   3. ISCC.exe scripts\installer.iss   (outputs dist/)

#define MyAppName "Procedia"
#define MyAppVersion "0.0.4"
#define MyAppPublisher "Uppercut Studio"
#define MyAppExtensionId "com.uppercut.procedia"
#define MyAppURL "https://procedia.app"
#define MyAppExeName "Procedia_Setup_v" + MyAppVersion

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={userappdata}\Adobe\CEP\extensions\{#MyAppExtensionId}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=..\dist
OutputBaseFilename={#MyAppExeName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayName=Procedia {#MyAppVersion}
LicenseFile=..\LICENSE

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\build\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Uninstall Procedia"; Filename: "{uninstallexe}"

[Registry]
; Enable unsigned CEP extension loading — required for Procedia to appear in AE's Window > Extensions menu.
; Each AE generation reads a different CSXS.<n> key: 9=2020, 10=2021, 11=2022-2024, 12=2025, 13/14=2026+.
; Set all so the same installer works across AE 2020-2026+. Removed on uninstall via uninsdeletevalue.
Root: HKCU; Subkey: "Software\Adobe\CSXS.9";  ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.10"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.11"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.12"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.13"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue
Root: HKCU; Subkey: "Software\Adobe\CSXS.14"; ValueType: string; ValueName: "PlayerDebugMode"; ValueData: "1"; Flags: uninsdeletevalue

[UninstallRun]
; Clean up any residual files/dirs after uninstall
Filename: "{cmd}"; Parameters: "/c rmdir /s /q ""{app}"""; Flags: runhidden

[Code]
function InitializeSetup: Boolean;
var
  AEFound: Boolean;
  I: Integer;
  J: Integer;
  RootKeys: array[0..1] of Integer;
  SubKeyNames: TArrayOfString;
  SubKeyName: String;
  VersionNum: Single;
  VersionStr: String;
  AppPath: String;
  DotPos: Integer;
begin
  Result := True;
  AEFound := False;

  RootKeys[0] := HKLM;
  RootKeys[1] := HKLM64;

  for I := 0 to 1 do
  begin
    if RegGetSubkeyNames(RootKeys[I], 'SOFTWARE\Adobe\After Effects', SubKeyNames) then
    begin
      for J := 0 to GetArrayLength(SubKeyNames) - 1 do
      begin
        SubKeyName := SubKeyNames[J];
        // Skip non-numeric keys (e.g. "CC", "CS6", "Settings")
        if (Length(SubKeyName) = 0) or (not ((SubKeyName[1] >= '0') and (SubKeyName[1] <= '9'))) then
          Continue;

        // Extract major version from "17.0" or "25.5.1"
        DotPos := Pos('.', SubKeyName);
        if DotPos > 0 then
          VersionStr := Copy(SubKeyName, 1, DotPos - 1)
        else
          VersionStr := SubKeyName;

        try
          VersionNum := StrToFloat(VersionStr);
        except
          VersionNum := 0;
        end;

        // Check for AE 2020 (v17) or newer
        if VersionNum >= 17.0 then
        begin
          // Modern CC installs write "InstallPath"; older installs wrote "ApplicationPath".
          AppPath := '';
          if not RegQueryStringValue(RootKeys[I], 'SOFTWARE\Adobe\After Effects\' + SubKeyName, 'InstallPath', AppPath) then
            RegQueryStringValue(RootKeys[I], 'SOFTWARE\Adobe\After Effects\' + SubKeyName, 'ApplicationPath', AppPath);
          if (AppPath <> '') and DirExists(AppPath) then
          begin
            AEFound := True;
            Break;
          end;
        end;
      end;
      if AEFound then Break;
    end;
  end;

  if not AEFound then
  begin
    if MsgBox('After Effects 2020+ was not detected on this system. ' +
              'Procedia requires AE 2020 (v17.0) or newer to run. ' +
              'Do you want to continue with the installation anyway?',
              mbConfirmation, MB_YESNO) = IDNO then
    begin
      Result := False;
    end;
  end;
end;
