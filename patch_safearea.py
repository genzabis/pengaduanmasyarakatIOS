import os
import re

files_to_patch = [
    r"src/app/result.tsx",
    r"src/app/register.tsx",
    r"src/app/login.tsx",
    r"src/app/(tabs)/profile.tsx",
    r"src/app/(tabs)/notifications.tsx",
    r"src/app/(tabs)/home.tsx",
    r"src/app/(tabs)/chat.tsx",
    r"src/app/(tabs)/main.tsx",
    r"src/app/(tabs)/list.tsx",
    r"src/app/report/[id].tsx"
]

for file_path in files_to_patch:
    if not os.path.exists(file_path):
        continue
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Remove SafeAreaView from react-native import
    # This regex looks for SafeAreaView, optionally surrounded by spaces, commas, etc.
    new_content = re.sub(r'(\bSafeAreaView\b\s*,?\s*)', '', content)
    # If the import became empty `{ } from 'react-native'`, we'd need to fix it, but usually there are other imports like View, Text.
    # We should be more careful.
    
    # Actually, a safer regex specifically for react-native import:
    # re.sub(r'(import\s*\{[^}]*?)(\bSafeAreaView\b\s*,?\s*)([^}]*?\}\s*from\s*[\'"]react-native[\'"])', r'\1\3', content)
    
    # A robust way:
    lines = content.split('\n')
    out_lines = []
    has_safe_area_context = False
    for line in lines:
        if "react-native-safe-area-context" in line:
            has_safe_area_context = True
    
    modified = False
    for line in lines:
        if "from 'react-native'" in line or 'from "react-native"' in line:
            if "SafeAreaView" in line:
                line = re.sub(r'\bSafeAreaView\b\s*,?\s*', '', line)
                # Cleanup any trailing comma before closing brace
                line = re.sub(r',\s*\}', ' }', line)
                modified = True
        out_lines.append(line)
        
        # Insert the new import right after the react-native import if needed
        if ("from 'react-native'" in line or 'from "react-native"' in line) and not has_safe_area_context and modified:
            out_lines.append("import { SafeAreaView } from 'react-native-safe-area-context';")
            has_safe_area_context = True

    if modified:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write('\n'.join(out_lines))
        print(f"Patched {file_path}")
    else:
        print(f"No changes for {file_path}")
