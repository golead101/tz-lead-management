!macro NSIS_HOOK_PREINSTALL
  ; Check if license.dat exists in the directory containing the installer ($EXEDIR)
  IfFileExists "$EXEDIR\license.dat" license_found no_license
  
  no_license:
    ; Terminate setup and show error popup
    MessageBox MB_OK|MB_ICONSTOP "Error: license.dat not found in the same folder as the installer. Please place your license.dat file in the same folder as this setup installer and try again."
    Abort
    
  license_found:
    ; Create app config directory inside user's system APPDATA directory
    CreateDirectory "$APPDATA\com.tz.leadmanagement"
    ; Copy license.dat from installer folder into the application's config directory
    CopyFiles "$EXEDIR\license.dat" "$APPDATA\com.tz.leadmanagement\license.dat"
!macroend
