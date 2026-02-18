#!/usr/bin/env python3
"""
Comprehensive Test Suite for Low-End Device Optimizations (Motorola G 2021)
Tests all UI corrections, haptic optimizations, and new widget functionality
"""

import re
import json
import subprocess
from pathlib import Path

class LowEndDeviceTestSuite:
    def __init__(self):
        self.base_path = Path("/app/mobile-app")
        self.test_results = {
            "passed_tests": [],
            "failed_tests": [],
            "issues": []
        }
    
    def log_success(self, test_name, details=""):
        """Log a successful test"""
        message = f"✅ {test_name}"
        if details:
            message += f": {details}"
        print(message)
        self.test_results["passed_tests"].append(message.replace("✅ ", ""))
    
    def log_failure(self, test_name, reason):
        """Log a failed test"""
        message = f"❌ {test_name}: {reason}"
        print(message)
        self.test_results["failed_tests"].append(message.replace("❌ ", ""))
        self.test_results["issues"].append({"test": test_name, "issue": reason})
    
    def read_file(self, file_path):
        """Read file content safely"""
        try:
            with open(self.base_path / file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            self.log_failure(f"Read {file_path}", f"Cannot read file: {e}")
            return ""
    
    def test_responsive_hook_enhancements(self):
        """Test useResponsive hook for low-end device support"""
        print("\n🔍 Testing useResponsive Hook Enhancements...")
        
        content = self.read_file("hooks/useResponsive.js")
        if not content:
            return
        
        # Test 1: Check isLowEndDevice implementation
        if re.search(r'isLowEndDevice\s*=.*isVerySmallPhone.*isSmallPhone.*height\s*<\s*700', content, re.DOTALL):
            self.log_success("isLowEndDevice Flag", "Properly detects low-end devices based on screen size and height < 700")
        else:
            self.log_failure("isLowEndDevice Flag", "isLowEndDevice logic not found or incorrect")
        
        # Test 2: Check tabBarPadding function
        if re.search(r'const\s+tabBarPadding\s*=\s*\(\)\s*=>\s*{', content):
            self.log_success("tabBarPadding Function", "Function exists and returns responsive bottom padding")
        else:
            self.log_failure("tabBarPadding Function", "tabBarPadding function not found")
        
        # Test 3: Check tabBarPadding logic for low-end devices
        if re.search(r'if\s*\(isVerySmallPhone\s*\|\|\s*isSmallPhone\)\s*return\s*75', content):
            self.log_success("tabBarPadding Logic", "Returns 75px for small/very small phones")
        else:
            self.log_failure("tabBarPadding Logic", "Specific padding for low-end devices not found")
        
        # Test 4: Check if isLowEndDevice is exported
        if re.search(r'isLowEndDevice', content) and re.search(r'return\s*{[\s\S]*isLowEndDevice', content):
            self.log_success("isLowEndDevice Export", "isLowEndDevice is properly exported from hook")
        else:
            self.log_failure("isLowEndDevice Export", "isLowEndDevice not exported from hook")
        
        # Test 5: Check breakpoint definitions
        breakpoints_found = re.findall(r'(\w+):\s*(\d+)', content)
        expected_breakpoints = ['verySmallPhone', 'smallPhone', 'phone', 'largePhone', 'tablet']
        found_breakpoint_names = [bp[0] for bp in breakpoints_found]
        
        for bp in expected_breakpoints:
            if bp in found_breakpoint_names:
                self.log_success(f"Breakpoint {bp}", "Defined correctly")
            else:
                self.log_failure(f"Breakpoint {bp}", "Not found in BREAKPOINTS")

    def test_haptic_optimizations(self):
        """Test that haptics are disabled for regular clicks"""
        print("\n🔍 Testing Haptic Optimizations (Disabled for Regular Clicks)...")
        
        # Test DoorCard haptic changes
        door_card = self.read_file("components/DoorCard.js")
        if door_card:
            # Check handlePress has haptic disabled comment
            if "// Haptic disabled for better performance" in door_card and "onPress?.(" in door_card:
                self.log_success("DoorCard Haptic Disabled", "Regular press haptic disabled with performance comment")
            else:
                self.log_failure("DoorCard Haptic Disabled", "Regular press still has haptic or comment missing")
            
            # Check handleLongPress still has haptic
            if re.search(r'handleLongPress.*Haptics\.impactAsync', door_card, re.DOTALL):
                self.log_success("DoorCard LongPress Haptic", "Long press still has haptic feedback")
            else:
                self.log_failure("DoorCard LongPress Haptic", "Long press haptic removed incorrectly")
        
        # Test HapticButton changes
        haptic_button = self.read_file("components/HapticButton.js")
        if haptic_button:
            if "// Haptic disabled - only use for important actions" in haptic_button:
                self.log_success("HapticButton Haptic Disabled", "Regular press haptic disabled with comment")
            else:
                self.log_failure("HapticButton Haptic Disabled", "Haptic still enabled or comment missing")
        
        # Test AnimatedThemeSwitch changes
        theme_switch = self.read_file("components/AnimatedThemeSwitch.js")
        if theme_switch:
            if "// Haptic disabled for regular clicks" in theme_switch:
                self.log_success("AnimatedThemeSwitch Haptic Disabled", "Theme toggle haptic disabled")
            else:
                self.log_failure("AnimatedThemeSwitch Haptic Disabled", "Theme toggle still has haptic")
        
        # Test PrimaryButton changes
        primary_button = self.read_file("components/PrimaryButton.js")
        if primary_button:
            if "// Haptic disabled for regular clicks - only on unlock" in primary_button:
                self.log_success("PrimaryButton Haptic Disabled", "Regular press haptic disabled")
            else:
                self.log_failure("PrimaryButton Haptic Disabled", "Regular press still has haptic")

    def test_layout_fixes(self):
        """Test layout fixes for tab bar overlap prevention"""
        print("\n🔍 Testing Layout Fixes for Tab Bar Overlap...")
        
        # Test DoorControlScreen changes
        door_control = self.read_file("screens/DoorControlScreen.js")
        if door_control:
            # Check ACTIONS_BOTTOM_MARGIN usage
            if re.search(r'ACTIONS_BOTTOM_MARGIN\s*=\s*tabBarPadding\(\)\s*\+\s*10', door_control):
                self.log_success("DoorControlScreen ACTIONS_BOTTOM_MARGIN", "Uses tabBarPadding() + 10 for bottom margin")
            else:
                self.log_failure("DoorControlScreen ACTIONS_BOTTOM_MARGIN", "ACTIONS_BOTTOM_MARGIN not properly implemented")
            
            # Check marginBottom usage in actions
            if re.search(r'marginBottom:\s*ACTIONS_BOTTOM_MARGIN', door_control):
                self.log_success("DoorControlScreen Actions Margin", "Actions use ACTIONS_BOTTOM_MARGIN to prevent overlap")
            else:
                self.log_failure("DoorControlScreen Actions Margin", "Actions don't use ACTIONS_BOTTOM_MARGIN")
            
            # Check isLowEndDevice usage
            if re.search(r'isLowEndDevice', door_control):
                self.log_success("DoorControlScreen Low-End Device Support", "Uses isLowEndDevice for responsive design")
            else:
                self.log_failure("DoorControlScreen Low-End Device Support", "isLowEndDevice not used")
        
        # Test App.js tab bar dimensions
        app_js = self.read_file("App.js")
        if app_js:
            # Check responsive tab bar height
            if re.search(r'tabBarHeight\s*=.*isLowEndDevice.*52.*56', app_js):
                self.log_success("App.js Responsive Tab Bar Height", "Tab bar height responsive (52px for low-end)")
            else:
                self.log_failure("App.js Responsive Tab Bar Height", "Tab bar height not responsive")
            
            # Check responsive tab bar margins
            if re.search(r'tabBarMargin\s*=.*isLowEndDevice.*12', app_js):
                self.log_success("App.js Responsive Tab Bar Margin", "Tab bar margin responsive (12px for low-end)")
            else:
                self.log_failure("App.js Responsive Tab Bar Margin", "Tab bar margin not responsive")
            
            # Check responsive icon and label sizes
            if re.search(r'iconSize\s*=.*isLowEndDevice.*18', app_js) and re.search(r'labelSize\s*=.*isLowEndDevice.*9', app_js):
                self.log_success("App.js Responsive Icon/Label Sizes", "Icon and label sizes responsive for low-end devices")
            else:
                self.log_failure("App.js Responsive Icon/Label Sizes", "Icon/label sizes not responsive")

    def test_widget_service(self):
        """Test WidgetService.js functionality and syntax"""
        print("\n🔍 Testing WidgetService.js Functionality...")
        
        widget_service = self.read_file("services/WidgetService.js")
        if not widget_service:
            return
        
        # Test class definition and methods
        required_methods = [
            'setPrimaryDoor', 'getPrimaryDoor', 'syncWidgetData', 
            'isWidgetReady', 'setWidgetEnabled', 'isWidgetEnabled',
            'authenticateForWidget', 'quickUnlock', 'clearWidgetData'
        ]
        
        for method in required_methods:
            if re.search(rf'async\s+{method}\s*\(', widget_service):
                self.log_success(f"WidgetService {method}", "Method properly defined as async")
            else:
                self.log_failure(f"WidgetService {method}", "Method not found or not async")
        
        # Test WIDGET_KEYS constant
        if re.search(r'const\s+WIDGET_KEYS\s*=\s*{', widget_service):
            self.log_success("WidgetService WIDGET_KEYS", "Constants defined for AsyncStorage keys")
        else:
            self.log_failure("WidgetService WIDGET_KEYS", "WIDGET_KEYS constants not found")
        
        # Test biometric authentication
        if re.search(r'LocalAuthentication\.authenticateAsync', widget_service):
            self.log_success("WidgetService Biometric Auth", "Uses LocalAuthentication for biometric auth")
        else:
            self.log_failure("WidgetService Biometric Auth", "Biometric authentication not implemented")
        
        # Test export
        if re.search(r'export\s+default\s+new\s+WidgetService\(\)', widget_service):
            self.log_success("WidgetService Export", "Properly exported as singleton")
        else:
            self.log_failure("WidgetService Export", "Not exported as singleton")

    def test_widget_settings_screen(self):
        """Test WidgetSettingsScreen.js navigation and UI"""
        print("\n🔍 Testing WidgetSettingsScreen.js...")
        
        widget_screen = self.read_file("screens/WidgetSettingsScreen.js")
        if not widget_screen:
            return
        
        # Test imports
        required_imports = ['WidgetService', 'Switch', 'SafeAreaView']
        for imp in required_imports:
            if imp in widget_screen:
                self.log_success(f"WidgetSettingsScreen Import {imp}", "Required import present")
            else:
                self.log_failure(f"WidgetSettingsScreen Import {imp}", "Required import missing")
        
        # Test state management
        state_vars = ['doors', 'primaryDoor', 'widgetEnabled', 'loading']
        for var in state_vars:
            if re.search(rf'\[{var},\s*set\w+\]\s*=\s*useState', widget_screen):
                self.log_success(f"WidgetSettingsScreen State {var}", "State variable properly defined")
            else:
                self.log_failure(f"WidgetSettingsScreen State {var}", "State variable not found")
        
        # Test key functions
        key_functions = ['handleToggleWidget', 'handleSelectDoor', 'handleTestUnlock']
        for func in key_functions:
            if re.search(rf'{func}\s*=\s*async', widget_screen):
                self.log_success(f"WidgetSettingsScreen {func}", "Key function properly defined")
            else:
                self.log_failure(f"WidgetSettingsScreen {func}", "Key function not found")
        
        # Test UI components
        ui_components = [
            ('Switch', 'Switch component'),
            (r'onPress=\{\(\)\s*=>\s*handleSelectDoor\(door\)', 'Door selection TouchableOpacity'),
            ('TestUnlock', 'Test unlock button')
        ]
        for pattern, name in ui_components:
            if re.search(pattern, widget_screen):
                self.log_success(f"WidgetSettingsScreen UI {name}", "UI component present")
            else:
                self.log_failure(f"WidgetSettingsScreen UI {name}", "UI component missing")

    def test_account_screen_widget_menu(self):
        """Test AccountScreen.js has Widget Settings menu"""
        print("\n🔍 Testing AccountScreen.js Widget Settings Menu...")
        
        account_screen = self.read_file("screens/AccountScreen.js")
        if not account_screen:
            return
        
        # Test Widget Settings navigation
        if re.search(r'navigate\(\s*[\'"]WidgetSettings[\'"]', account_screen):
            self.log_success("AccountScreen Widget Navigation", "WidgetSettings navigation present")
        else:
            self.log_failure("AccountScreen Widget Navigation", "WidgetSettings navigation not found")
        
        # Test Widget Settings menu button
        if re.search(r'<Smartphone.*Quick Unlock Widget', account_screen, re.DOTALL):
            self.log_success("AccountScreen Widget Menu Button", "Widget settings menu button with Smartphone icon")
        else:
            self.log_failure("AccountScreen Widget Menu Button", "Widget settings menu button not found")
        
        # Test import for Smartphone icon
        if 'Smartphone' in account_screen and re.search(r'from\s+[\'"]lucide-react-native[\'"]', account_screen):
            self.log_success("AccountScreen Smartphone Import", "Smartphone icon imported from lucide-react-native")
        else:
            self.log_failure("AccountScreen Smartphone Import", "Smartphone icon import missing")

    def test_navigation_integration(self):
        """Test navigation integration for widget screens"""
        print("\n🔍 Testing Navigation Integration...")
        
        app_js = self.read_file("App.js")
        if app_js:
            # Check WidgetSettingsScreen import
            if 'WidgetSettingsScreen' in app_js:
                self.log_success("App.js WidgetSettingsScreen Import", "WidgetSettingsScreen imported")
            else:
                self.log_failure("App.js WidgetSettingsScreen Import", "WidgetSettingsScreen not imported")
            
            # Check WidgetSettings route in AccountStack
            if re.search(r'<Stack\.Screen.*name=.*WidgetSettings.*component.*WidgetSettingsScreen', app_js):
                self.log_success("App.js WidgetSettings Route", "WidgetSettings route added to AccountStack")
            else:
                self.log_failure("App.js WidgetSettings Route", "WidgetSettings route not found in AccountStack")

    def run_all_tests(self):
        """Run all test categories"""
        print("🚀 Starting Low-End Device Optimization Test Suite...")
        print("=" * 60)
        
        self.test_responsive_hook_enhancements()
        self.test_haptic_optimizations()
        self.test_layout_fixes()
        self.test_widget_service()
        self.test_widget_settings_screen()
        self.test_account_screen_widget_menu()
        self.test_navigation_integration()
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed_count = len(self.test_results["passed_tests"])
        failed_count = len(self.test_results["failed_tests"])
        total_count = passed_count + failed_count
        
        print(f"✅ Passed: {passed_count}/{total_count} tests")
        print(f"❌ Failed: {failed_count}/{total_count} tests")
        
        if failed_count > 0:
            print(f"\n❌ FAILED TESTS:")
            for test in self.test_results["failed_tests"]:
                print(f"  • {test}")
        
        success_percentage = (passed_count / total_count * 100) if total_count > 0 else 100
        print(f"\n📈 Success Rate: {success_percentage:.1f}%")
        
        return self.test_results

if __name__ == "__main__":
    suite = LowEndDeviceTestSuite()
    results = suite.run_all_tests()