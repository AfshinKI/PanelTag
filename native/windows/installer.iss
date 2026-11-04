#ifndef AppVersion
#define AppVersion "0.4.0"
#endif
#ifndef Arch
#define Arch "x64"
#endif
[Setup]
AppId=PanelTag
AppName=PanelTag
AppVersion={#AppVersion}
AppPublisher=Afshin K.I.
AppPublisherURL=https://afshinki.github.io/PanelTag/
DefaultDirName={localappdata}\Programs\PanelTag
DefaultGroupName=PanelTag
PrivilegesRequired=lowest
#if Arch == "arm64"
ArchitecturesAllowed=arm64
ArchitecturesInstallIn64BitMode=arm64
#else
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
#endif
MinVersion=10.0.17763
OutputDir=..\..\dist
OutputBaseFilename=PanelTag-{#AppVersion}-windows-{#Arch}-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
CloseApplications=yes
RestartApplications=no
UninstallDisplayIcon={app}\PanelTag.exe
[Files]
Source: "..\..\build\windows-{#Arch}\PanelTag.exe"; DestDir: "{app}"; Flags: ignoreversion
[Icons]
Name: "{group}\PanelTag"; Filename: "{app}\PanelTag.exe"
[Run]
Filename: "{app}\PanelTag.exe"; Description: "Launch PanelTag"; Flags: nowait postinstall skipifsilent
[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueName: "PanelTag"; Flags: uninsdeletevalue
