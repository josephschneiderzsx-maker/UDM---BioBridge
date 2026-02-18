#!/usr/bin/env python3

import os
import json
import sys
from pathlib import Path
import re

class PremiumFeaturesValidator:
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
            self.passed_tests.append(f"{name}: {details}" if details else name)
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            self.issues.append({"test": name, "issue": details})
            print(f"❌ {name}")
            if details:
                print(f"   {details}")

    def test_useresponsive_hook(self):
        """Test if useResponsive hook is properly implemented"""
        hook_file = self.root_path / "hooks/useResponsive.js"
        
        if not hook_file.exists():
            self.log_test("useResponsive Hook - File Exists", False, "useResponsive.js not found")
            return
            
        try:
            with open(hook_file, 'r') as f:
                content = f.read()
            
            # Check essential functions
            required_functions = [
                'scaleWidth', 'scaleHeight', 'scaleFont', 'spacing', 'radius',
                'iconSize', 'buttonHeight', 'cardPadding', 'headerHeight',
                'tabBarHeight', 'hitSlop', 'gridColumns', 'contentMaxWidth'
            ]
            
            missing_functions = []
            for func in required_functions:
                if f"const {func} = " not in content and f"{func}:" not in content:
                    missing_functions.append(func)
            
            if missing_functions:
                self.log_test("useResponsive Hook - Functions", False, 
                             f"Missing functions: {', '.join(missing_functions)}")
            else:
                self.log_test("useResponsive Hook - Functions", True, 
                             f"All {len(required_functions)} responsive functions present")
            
            # Check device detection
            device_checks = ['isSmallPhone', 'isPhone', 'isLargePhone', 'isTablet']
            missing_checks = []
            for check in device_checks:
                if check not in content:
                    missing_checks.append(check)
            
            if missing_checks:
                self.log_test("useResponsive Hook - Device Detection", False,
                             f"Missing device checks: {', '.join(missing_checks)}")
            else:
                self.log_test("useResponsive Hook - Device Detection", True,
                             "All device type detection present")
                             
            # Check breakpoints
            if "BREAKPOINTS" not in content:
                self.log_test("useResponsive Hook - Breakpoints", False, "Breakpoints not defined")
            else:
                self.log_test("useResponsive Hook - Breakpoints", True, "Breakpoints defined")
                
        except Exception as e:
            self.log_test("useResponsive Hook - Reading", False, f"Error reading file: {str(e)}")

    def test_theme_context_enhancements(self):
        """Test if ThemeContext has animation enhancements"""
        theme_file = self.root_path / "contexts/ThemeContext.js"
        
        if not theme_file.exists():
            self.log_test("ThemeContext - File Exists", False, "ThemeContext.js not found")
            return
            
        try:
            with open(theme_file, 'r') as f:
                content = f.read()
            
            # Check for animation features
            animation_features = [
                'transitionProgress', 'overlayOpacity', 'animatedColors',
                'animateThemeChange', 'Animated.timing'
            ]
            
            missing_features = []
            for feature in animation_features:
                if feature not in content:
                    missing_features.append(feature)
            
            if missing_features:
                self.log_test("ThemeContext - Animations", False,
                             f"Missing animation features: {', '.join(missing_features)}")
            else:
                self.log_test("ThemeContext - Animations", True,
                             "Theme transition animations present")
            
            # Check for haptic feedback
            if "Haptics" not in content:
                self.log_test("ThemeContext - Haptics", False, "Haptic feedback not implemented")
            else:
                self.log_test("ThemeContext - Haptics", True, "Haptic feedback integrated")
                
        except Exception as e:
            self.log_test("ThemeContext - Reading", False, f"Error reading file: {str(e)}")

    def test_skeleton_loader_component(self):
        """Test SkeletonLoader component implementation"""
        skeleton_file = self.root_path / "components/SkeletonLoader.js"
        
        if not skeleton_file.exists():
            self.log_test("SkeletonLoader - File Exists", False, "SkeletonLoader.js not found")
            return
            
        try:
            with open(skeleton_file, 'r') as f:
                content = f.read()
            
            # Check for shimmer effect
            shimmer_features = ['shimmerAnim', 'LinearGradient', 'translateX', 'Animated.loop']
            missing_shimmer = []
            for feature in shimmer_features:
                if feature not in content:
                    missing_shimmer.append(feature)
            
            if missing_shimmer:
                self.log_test("SkeletonLoader - Shimmer Effect", False,
                             f"Missing shimmer features: {', '.join(missing_shimmer)}")
            else:
                self.log_test("SkeletonLoader - Shimmer Effect", True,
                             "Shimmer animation implemented")
            
            # Check for preset components
            presets = ['DoorCardSkeleton', 'SkeletonList', 'ActivitySkeleton']
            missing_presets = []
            for preset in presets:
                if f"export function {preset}" not in content and f"export const {preset}" not in content:
                    missing_presets.append(preset)
            
            if missing_presets:
                self.log_test("SkeletonLoader - Presets", False,
                             f"Missing preset components: {', '.join(missing_presets)}")
            else:
                self.log_test("SkeletonLoader - Presets", True,
                             "All skeleton presets implemented")
                             
        except Exception as e:
            self.log_test("SkeletonLoader - Reading", False, f"Error reading file: {str(e)}")

    def test_animated_theme_switch(self):
        """Test AnimatedThemeSwitch component"""
        switch_file = self.root_path / "components/AnimatedThemeSwitch.js"
        
        if not switch_file.exists():
            self.log_test("AnimatedThemeSwitch - File Exists", False, "AnimatedThemeSwitch.js not found")
            return
            
        try:
            with open(switch_file, 'r') as f:
                content = f.read()
            
            # Check for animations
            animations = ['rotateAnim', 'scaleAnim', 'glowAnim', 'Animated.spring']
            missing_animations = []
            for anim in animations:
                if anim not in content:
                    missing_animations.append(anim)
            
            if missing_animations:
                self.log_test("AnimatedThemeSwitch - Animations", False,
                             f"Missing animations: {', '.join(missing_animations)}")
            else:
                self.log_test("AnimatedThemeSwitch - Animations", True,
                             "All switch animations present")
            
            # Check for icons
            if "Sun" not in content or "Moon" not in content:
                self.log_test("AnimatedThemeSwitch - Icons", False, "Sun/Moon icons not found")
            else:
                self.log_test("AnimatedThemeSwitch - Icons", True, "Theme icons present")
                
        except Exception as e:
            self.log_test("AnimatedThemeSwitch - Reading", False, f"Error reading file: {str(e)}")

    def test_haptic_button_component(self):
        """Test HapticButton component"""
        haptic_file = self.root_path / "components/HapticButton.js"
        
        if not haptic_file.exists():
            self.log_test("HapticButton - File Exists", False, "HapticButton.js not found")
            return
            
        try:
            with open(haptic_file, 'r') as f:
                content = f.read()
            
            # Check for haptic feedback
            haptic_features = ['Haptics', 'triggerHaptic', 'ImpactFeedbackStyle']
            missing_haptic = []
            for feature in haptic_features:
                if feature not in content:
                    missing_haptic.append(feature)
            
            if missing_haptic:
                self.log_test("HapticButton - Haptic Features", False,
                             f"Missing haptic features: {', '.join(missing_haptic)}")
            else:
                self.log_test("HapticButton - Haptic Features", True,
                             "Haptic feedback implemented")
            
            # Check for responsive sizing
            if "useResponsive" not in content:
                self.log_test("HapticButton - Responsive", False, "useResponsive hook not used")
            else:
                self.log_test("HapticButton - Responsive", True, "Responsive design implemented")
                
        except Exception as e:
            self.log_test("HapticButton - Reading", False, f"Error reading file: {str(e)}")

    def test_premium_refresh_control(self):
        """Test PremiumRefreshControl component"""
        refresh_file = self.root_path / "components/PremiumRefreshControl.js"
        
        if not refresh_file.exists():
            self.log_test("PremiumRefreshControl - File Exists", False, "PremiumRefreshControl.js not found")
            return
            
        try:
            with open(refresh_file, 'r') as f:
                content = f.read()
            
            # Check for animations
            animations = ['spinAnim', 'scaleAnim', 'opacityAnim', 'Animated.loop']
            missing_animations = []
            for anim in animations:
                if anim not in content:
                    missing_animations.append(anim)
            
            if missing_animations:
                self.log_test("PremiumRefreshControl - Animations", False,
                             f"Missing animations: {', '.join(missing_animations)}")
            else:
                self.log_test("PremiumRefreshControl - Animations", True,
                             "Premium animations implemented")
                             
        except Exception as e:
            self.log_test("PremiumRefreshControl - Reading", False, f"Error reading file: {str(e)}")

    def test_responsive_screen_integration(self):
        """Test if screens are using responsive features"""
        screens = ['DoorListScreen.js', 'LoginScreen.js', 'DoorControlScreen.js', 
                  'AccountScreen.js', 'ActivityLogScreen.js']
        
        responsive_usage = 0
        total_screens = len(screens)
        
        for screen in screens:
            screen_file = self.root_path / "screens" / screen
            if screen_file.exists():
                try:
                    with open(screen_file, 'r') as f:
                        content = f.read()
                    
                    if "useResponsive" in content and "scaleFont" in content:
                        responsive_usage += 1
                except Exception:
                    pass
        
        if responsive_usage == total_screens:
            self.log_test("Screen Responsive Integration", True,
                         f"All {total_screens} screens use responsive design")
        elif responsive_usage > 0:
            self.log_test("Screen Responsive Integration", False,
                         f"Only {responsive_usage}/{total_screens} screens use responsive design")
        else:
            self.log_test("Screen Responsive Integration", False,
                         "No screens use responsive design")

    def test_glass_background_implementation(self):
        """Test GlassBackground component"""
        glass_file = self.root_path / "components/GlassBackground.js"
        
        if not glass_file.exists():
            self.log_test("GlassBackground - File Exists", False, "GlassBackground.js not found")
            return
            
        try:
            with open(glass_file, 'r') as f:
                content = f.read()
            
            # Check for BlurView usage
            if "BlurView" not in content:
                self.log_test("GlassBackground - BlurView", False, "BlurView component not found")
            else:
                self.log_test("GlassBackground - BlurView", True, "BlurView integration present")
            
            # Check for fallback implementation
            if "fallback" not in content.lower():
                self.log_test("GlassBackground - Fallback", False, "No fallback implementation")
            else:
                self.log_test("GlassBackground - Fallback", True, "Fallback implementation present")
                
        except Exception as e:
            self.log_test("GlassBackground - Reading", False, f"Error reading file: {str(e)}")

    def test_enhanced_components(self):
        """Test enhanced versions of existing components"""
        enhanced_components = {
            'DoorCard.js': ['animations', 'micro-animations', 'responsiveness'],
            'Input.js': ['enhanced animations', 'error states', 'accessibility'],
            'PrimaryButton.js': ['haptic feedback', 'responsive sizing'],
            'StatusBadge.js': ['pulse animation', 'responsive sizing']
        }
        
        for component, features in enhanced_components.items():
            comp_file = self.root_path / "components" / component
            if comp_file.exists():
                try:
                    with open(comp_file, 'r') as f:
                        content = f.read()
                    
                    feature_count = 0
                    # Check for animation-related code
                    if "Animated" in content and ("spring" in content or "timing" in content):
                        feature_count += 1
                    
                    # Check for responsive code
                    if "useResponsive" in content or "scaleFont" in content:
                        feature_count += 1
                    
                    # Check for haptic feedback
                    if "Haptics" in content:
                        feature_count += 1
                    
                    if feature_count >= 2:
                        self.log_test(f"Enhanced Component - {component}", True,
                                     "Premium enhancements implemented")
                    else:
                        self.log_test(f"Enhanced Component - {component}", False,
                                     "Missing premium enhancements")
                        
                except Exception as e:
                    self.log_test(f"Enhanced Component - {component}", False,
                                 f"Error reading: {str(e)}")

    def run_all_tests(self):
        """Run all premium feature validation tests"""
        print("🚀 Starting Premium Features Validation...\n")
        
        self.test_useresponsive_hook()
        self.test_theme_context_enhancements()
        self.test_skeleton_loader_component()
        self.test_animated_theme_switch()
        self.test_haptic_button_component()
        self.test_premium_refresh_control()
        self.test_responsive_screen_integration()
        self.test_glass_background_implementation()
        self.test_enhanced_components()
        
        print(f"\n📊 Premium Feature Tests: {self.tests_passed}/{self.tests_run} passed")
        
        if self.issues:
            print("\n❌ Issues found:")
            for issue in self.issues:
                print(f"  • {issue['test']}: {issue['issue']}")
        else:
            print("\n🎉 All premium features are properly implemented!")
        
        return len(self.issues) == 0

def main():
    validator = PremiumFeaturesValidator()
    success = validator.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())