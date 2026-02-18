#!/usr/bin/env python3

import os
import json
import sys
from pathlib import Path
import subprocess

class ReactNativeStructureValidator:
    def __init__(self, root_path="/app/mobile-app"):
        self.root_path = Path(root_path)
        self.tests_run = 0
        self.tests_passed = 0
        self.issues = []
        self.passed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            self.passed_tests.append(name)
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            self.issues.append({"test": name, "issue": details})
            print(f"❌ {name}")
            if details:
                print(f"   {details}")

    def test_expo_structure(self):
        """Test if basic Expo structure is valid"""
        # Check essential files exist
        essential_files = [
            "package.json",
            "App.js", 
            "app.json",
            "babel.config.js"
        ]
        
        missing_files = []
        for file in essential_files:
            if not (self.root_path / file).exists():
                missing_files.append(file)
        
        if missing_files:
            self.log_test("Expo Structure - Essential Files", False, 
                         f"Missing files: {', '.join(missing_files)}")
        else:
            self.log_test("Expo Structure - Essential Files", True,
                         "All essential Expo files present")

    def test_package_json_validity(self):
        """Test if package.json is valid and has required fields"""
        try:
            with open(self.root_path / "package.json", "r") as f:
                package_data = json.load(f)
            
            required_fields = ["name", "version", "dependencies", "scripts"]
            missing_fields = [field for field in required_fields if field not in package_data]
            
            if missing_fields:
                self.log_test("Package.json Structure", False, 
                             f"Missing required fields: {', '.join(missing_fields)}")
            else:
                self.log_test("Package.json Structure", True, 
                             "All required fields present")
                
            # Check if has Expo dependency
            if "expo" not in package_data.get("dependencies", {}):
                self.log_test("Expo Dependency", False, "Expo not found in dependencies")
            else:
                expo_version = package_data["dependencies"]["expo"]
                self.log_test("Expo Dependency", True, f"Expo version: {expo_version}")
                
        except json.JSONDecodeError:
            self.log_test("Package.json Validity", False, "package.json is not valid JSON")
        except FileNotFoundError:
            self.log_test("Package.json Validity", False, "package.json not found")

    def test_app_json_validity(self):
        """Test if app.json is valid"""
        try:
            with open(self.root_path / "app.json", "r") as f:
                app_data = json.load(f)
            
            if "expo" not in app_data:
                self.log_test("App.json Structure", False, "Missing 'expo' configuration")
            else:
                expo_config = app_data["expo"]
                required_expo_fields = ["name", "slug", "version"]
                missing_fields = [field for field in required_expo_fields 
                                if field not in expo_config]
                
                if missing_fields:
                    self.log_test("App.json Expo Config", False, 
                                 f"Missing expo fields: {', '.join(missing_fields)}")
                else:
                    self.log_test("App.json Expo Config", True, 
                                 f"App: {expo_config.get('name')} v{expo_config.get('version')}")
                    
        except json.JSONDecodeError:
            self.log_test("App.json Validity", False, "app.json is not valid JSON")
        except FileNotFoundError:
            self.log_test("App.json Validity", False, "app.json not found")

    def test_javascript_syntax(self):
        """Test JavaScript files for syntax errors using node"""
        js_files = []
        
        # Find all .js files
        for pattern in ["*.js", "screens/*.js", "components/*.js", "services/*.js", "constants/*.js"]:
            js_files.extend(self.root_path.glob(pattern))
        
        syntax_errors = []
        for js_file in js_files:
            try:
                # Use node to check syntax
                result = subprocess.run(
                    ["node", "-c", str(js_file)], 
                    capture_output=True, 
                    text=True,
                    cwd=str(self.root_path)
                )
                if result.returncode != 0:
                    syntax_errors.append(f"{js_file.name}: {result.stderr.strip()}")
            except FileNotFoundError:
                syntax_errors.append(f"{js_file.name}: Node.js not available for syntax check")
            except Exception as e:
                syntax_errors.append(f"{js_file.name}: {str(e)}")
        
        if syntax_errors:
            self.log_test("JavaScript Syntax Check", False, 
                         f"Syntax errors found: {'; '.join(syntax_errors)}")
        else:
            self.log_test("JavaScript Syntax Check", True, 
                         f"All {len(js_files)} JavaScript files have valid syntax")

    def test_imports_existence(self):
        """Test if imported files exist"""
        import_issues = []
        
        # Check App.js imports
        app_imports = {
            "ServerConfigScreen": "screens/ServerConfigScreen.js",
            "LoginScreen": "screens/LoginScreen.js", 
            "DoorListScreen": "screens/DoorListScreen.js",
            "DoorControlScreen": "screens/DoorControlScreen.js",
            "theme constants": "constants/theme.js"
        }
        
        for name, path in app_imports.items():
            if not (self.root_path / path).exists():
                import_issues.append(f"App.js imports {name} from {path} - file not found")
        
        # Check component imports 
        component_files = list(self.root_path.glob("components/*.js"))
        for comp_file in component_files:
            # Check if it imports theme constants
            try:
                with open(comp_file, 'r') as f:
                    content = f.read()
                    if "../constants/theme" in content:
                        if not (self.root_path / "constants/theme.js").exists():
                            import_issues.append(f"{comp_file.name} imports theme constants - file not found")
            except Exception as e:
                import_issues.append(f"Error reading {comp_file.name}: {str(e)}")
        
        # Check screen imports
        screen_files = list(self.root_path.glob("screens/*.js"))
        for screen_file in screen_files:
            try:
                with open(screen_file, 'r') as f:
                    content = f.read()
                    # Check common imports
                    if "../services/api" in content:
                        if not (self.root_path / "services/api.js").exists():
                            import_issues.append(f"{screen_file.name} imports api service - file not found")
                    if "../constants/theme" in content:
                        if not (self.root_path / "constants/theme.js").exists():
                            import_issues.append(f"{screen_file.name} imports theme constants - file not found")
            except Exception as e:
                import_issues.append(f"Error reading {screen_file.name}: {str(e)}")
        
        if import_issues:
            self.log_test("Import File Existence", False, 
                         f"Import issues: {'; '.join(import_issues)}")
        else:
            self.log_test("Import File Existence", True, 
                         "All imported files exist")

    def test_theme_exports(self):
        """Test if theme.js has proper exports"""
        try:
            theme_file = self.root_path / "constants/theme.js"
            if not theme_file.exists():
                self.log_test("Theme Exports", False, "theme.js file not found")
                return
                
            with open(theme_file, 'r') as f:
                content = f.read()
            
            expected_exports = ["colors", "typography", "spacing", "borderRadius", "shadows"]
            missing_exports = []
            
            for export in expected_exports:
                if f"export const {export}" not in content:
                    missing_exports.append(export)
            
            if missing_exports:
                self.log_test("Theme Exports", False, 
                             f"Missing exports: {', '.join(missing_exports)}")
            else:
                self.log_test("Theme Exports", True, 
                             "All expected theme exports present")
                
        except Exception as e:
            self.log_test("Theme Exports", False, f"Error reading theme.js: {str(e)}")

    def test_lucide_icons_usage(self):
        """Test if lucide-react-native icons are properly imported"""
        lucide_issues = []
        
        files_to_check = []
        files_to_check.extend(self.root_path.glob("screens/*.js"))
        files_to_check.extend(self.root_path.glob("components/*.js"))
        
        for file_path in files_to_check:
            try:
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check if file uses lucide icons
                if "lucide-react-native" in content:
                    # Check for proper import pattern (handles multi-line imports)
                    # Look for either "import ... from 'lucide-react-native'" or "} from 'lucide-react-native'"
                    has_proper_import = (
                        "import " in content and "from 'lucide-react-native'" in content
                    ) or (
                        "} from 'lucide-react-native'" in content
                    )
                    
                    if not has_proper_import:
                        lucide_issues.append(f"{file_path.name}: Uses lucide but no proper import found")
                        
            except Exception as e:
                lucide_issues.append(f"Error reading {file_path.name}: {str(e)}")
        
        if lucide_issues:
            self.log_test("Lucide Icons Import", False, 
                         f"Issues: {'; '.join(lucide_issues)}")
        else:
            self.log_test("Lucide Icons Import", True, 
                         "Lucide icons properly imported where used")

    def test_navigation_setup(self):
        """Test if navigation is properly set up"""
        try:
            with open(self.root_path / "App.js", 'r') as f:
                app_content = f.read()
            
            navigation_elements = [
                "@react-navigation/native",
                "@react-navigation/stack", 
                "NavigationContainer",
                "createStackNavigator"
            ]
            
            missing_elements = []
            for element in navigation_elements:
                if element not in app_content:
                    missing_elements.append(element)
            
            if missing_elements:
                self.log_test("Navigation Setup", False, 
                             f"Missing navigation elements: {', '.join(missing_elements)}")
            else:
                self.log_test("Navigation Setup", True, 
                             "Navigation properly configured")
                
        except Exception as e:
            self.log_test("Navigation Setup", False, f"Error reading App.js: {str(e)}")

    def run_all_tests(self):
        """Run all validation tests"""
        print("🔍 Starting React Native Expo App Structure Validation...\n")
        
        self.test_expo_structure()
        self.test_package_json_validity()
        self.test_app_json_validity() 
        self.test_javascript_syntax()
        self.test_imports_existence()
        self.test_theme_exports()
        self.test_lucide_icons_usage()
        self.test_navigation_setup()
        
        print(f"\n📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.issues:
            print("\n❌ Issues found:")
            for issue in self.issues:
                print(f"  • {issue['test']}: {issue['issue']}")
        else:
            print("\n🎉 All tests passed! The React Native Expo app structure is valid.")
        
        return len(self.issues) == 0

def main():
    validator = ReactNativeStructureValidator()
    success = validator.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())