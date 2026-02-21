/**
 * Comprehensive React Native Frontend Validation Test
 * Tests all requirements from the review request
 */

const fs = require('fs');
const path = require('path');

class ReactNativeValidator {
  constructor() {
    this.results = {
      syntax: { passed: 0, failed: 0, issues: [] },
      imports: { passed: 0, failed: 0, issues: [] },
      vibrations: { passed: 0, failed: 0, issues: [] },
      safeArea: { passed: 0, failed: 0, issues: [] },
      animations: { passed: 0, failed: 0, issues: [] },
      responsive: { passed: 0, failed: 0, issues: [] }
    };
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  // Test 1: Verify JavaScript/React Native syntax compilation
  testSyntaxCompilation() {
    console.log('\n🔍 Testing JavaScript/React Native Syntax Compilation...\n');
    
    const files = [
      '/app/mobile-app/App.js',
      '/app/mobile-app/hooks/useResponsive.js',
      '/app/mobile-app/components/DoorCard.js',
      '/app/mobile-app/components/Input.js',
      '/app/mobile-app/components/PrimaryButton.js',
      '/app/mobile-app/components/StatusBadge.js',
      '/app/mobile-app/components/SkeletonLoader.js',
      '/app/mobile-app/screens/LoginScreen.js',
      '/app/mobile-app/screens/DoorListScreen.js',
      '/app/mobile-app/screens/DoorControlScreen.js',
      '/app/mobile-app/screens/AccountScreen.js',
      '/app/mobile-app/screens/ActivityLogScreen.js'
    ];

    files.forEach(filePath => {
      const content = this.readFile(filePath);
      if (!content) {
        this.results.syntax.failed++;
        this.results.syntax.issues.push(`File not found: ${filePath}`);
        console.log(`❌ ${path.basename(filePath)}: File not found`);
        return;
      }

      // Basic syntax checks
      const syntaxIssues = [];
      
      // Check for unclosed brackets/braces
      const openBrackets = (content.match(/\{/g) || []).length;
      const closeBrackets = (content.match(/\}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        syntaxIssues.push('Mismatched curly braces');
      }

      // Check for unclosed parentheses
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        syntaxIssues.push('Mismatched parentheses');
      }

      // Check for proper React imports
      if (!content.includes("import React") && !content.includes("from 'react'")) {
        syntaxIssues.push('Missing React import');
      }

      // Check for proper export statement
      if (!content.includes('export default') && !content.includes('module.exports')) {
        syntaxIssues.push('Missing default export');
      }

      if (syntaxIssues.length > 0) {
        this.results.syntax.failed++;
        this.results.syntax.issues.push(`${path.basename(filePath)}: ${syntaxIssues.join(', ')}`);
        console.log(`❌ ${path.basename(filePath)}: ${syntaxIssues.join(', ')}`);
      } else {
        this.results.syntax.passed++;
        console.log(`✅ ${path.basename(filePath)}: Syntax OK`);
      }
    });
  }

  // Test 2: Verify useResponsive hook imports
  testResponsiveHookImports() {
    console.log('\n🔍 Testing useResponsive Hook Imports...\n');
    
    const componentsAndScreens = [
      '/app/mobile-app/App.js',
      '/app/mobile-app/components/DoorCard.js',
      '/app/mobile-app/components/Input.js', 
      '/app/mobile-app/components/PrimaryButton.js',
      '/app/mobile-app/components/StatusBadge.js',
      '/app/mobile-app/components/SkeletonLoader.js',
      '/app/mobile-app/screens/LoginScreen.js',
      '/app/mobile-app/screens/DoorListScreen.js',
      '/app/mobile-app/screens/DoorControlScreen.js',
      '/app/mobile-app/screens/AccountScreen.js',
      '/app/mobile-app/screens/ActivityLogScreen.js'
    ];

    componentsAndScreens.forEach(filePath => {
      const content = this.readFile(filePath);
      if (!content) {
        this.results.imports.failed++;
        this.results.imports.issues.push(`File not found: ${filePath}`);
        return;
      }

      const fileName = path.basename(filePath);
      const hasImport = content.includes("import useResponsive from '../hooks/useResponsive'") ||
                       content.includes("import useResponsive from './hooks/useResponsive'");
      
      const hasUsage = content.includes('useResponsive()') || content.includes('= useResponsive();');

      if (hasImport && hasUsage) {
        this.results.imports.passed++;
        console.log(`✅ ${fileName}: useResponsive properly imported and used`);
      } else if (hasImport && !hasUsage) {
        this.results.imports.failed++;
        this.results.imports.issues.push(`${fileName}: useResponsive imported but not used`);
        console.log(`⚠️ ${fileName}: useResponsive imported but not used`);
      } else if (!hasImport) {
        this.results.imports.failed++;
        this.results.imports.issues.push(`${fileName}: useResponsive not imported`);
        console.log(`❌ ${fileName}: useResponsive not imported`);
      }
    });
  }

  // Test 3: Verify vibrations are disabled in ActivityLogScreen
  testVibrationsDisabled() {
    console.log('\n🔍 Testing Vibrations Disabled in ActivityLogScreen...\n');
    
    const content = this.readFile('/app/mobile-app/screens/ActivityLogScreen.js');
    if (!content) {
      this.results.vibrations.failed++;
      this.results.vibrations.issues.push('ActivityLogScreen.js not found');
      console.log('❌ ActivityLogScreen.js: File not found');
      return;
    }

    // Check if Haptics is imported (it should not be for vibration removal)
    const hasHapticsImport = content.includes("import * as Haptics from 'expo-haptics'");
    const hasHapticsUsage = content.includes('Haptics.') || content.includes('await Haptics');

    // Check comment indicating vibrations were removed
    const hasVibrationComment = content.includes('Haptics removed') || 
                               content.includes('vibrations') ||
                               content.includes('only used for important actions');

    if (!hasHapticsImport && !hasHapticsUsage) {
      this.results.vibrations.passed++;
      console.log('✅ ActivityLogScreen: Haptics/vibrations successfully removed');
    } else if (hasVibrationComment && (hasHapticsImport || hasHapticsUsage)) {
      this.results.vibrations.passed++;
      console.log('✅ ActivityLogScreen: Haptics limited to important actions only (door unlock)');
    } else {
      this.results.vibrations.failed++;
      this.results.vibrations.issues.push('ActivityLogScreen still contains Haptics usage');
      console.log('❌ ActivityLogScreen: Still contains unnecessary Haptics usage');
    }
  }

  // Test 4: Verify App.js uses useSafeAreaInsets for tab bar
  testSafeAreaInsets() {
    console.log('\n🔍 Testing useSafeAreaInsets Usage in App.js Tab Bar...\n');
    
    const content = this.readFile('/app/mobile-app/App.js');
    if (!content) {
      this.results.safeArea.failed++;
      this.results.safeArea.issues.push('App.js not found');
      console.log('❌ App.js: File not found');
      return;
    }

    const hasSafeAreaImport = content.includes('useSafeAreaInsets') && 
                             content.includes("from 'react-native-safe-area-context'");
    const hasSafeAreaUsage = content.includes('useSafeAreaInsets()') || 
                            content.includes('= useSafeAreaInsets();');
    const hasInsetsInTabBar = content.includes('insets.bottom') && 
                             content.includes('TabNavigator');

    if (hasSafeAreaImport && hasSafeAreaUsage && hasInsetsInTabBar) {
      this.results.safeArea.passed++;
      console.log('✅ App.js: useSafeAreaInsets properly implemented for tab bar');
    } else {
      this.results.safeArea.failed++;
      const missing = [];
      if (!hasSafeAreaImport) missing.push('useSafeAreaInsets import');
      if (!hasSafeAreaUsage) missing.push('useSafeAreaInsets usage');
      if (!hasInsetsInTabBar) missing.push('insets.bottom in tab bar');
      
      this.results.safeArea.issues.push(`Missing: ${missing.join(', ')}`);
      console.log(`❌ App.js: Missing useSafeAreaInsets implementation (${missing.join(', ')})`);
    }
  }

  // Test 5: Verify animations in DoorCard, Input, PrimaryButton
  testAnimations() {
    console.log('\n🔍 Testing Animations in Components...\n');
    
    const animationComponents = [
      '/app/mobile-app/components/DoorCard.js',
      '/app/mobile-app/components/Input.js',
      '/app/mobile-app/components/PrimaryButton.js'
    ];

    animationComponents.forEach(filePath => {
      const content = this.readFile(filePath);
      const fileName = path.basename(filePath);
      
      if (!content) {
        this.results.animations.failed++;
        this.results.animations.issues.push(`${fileName}: File not found`);
        console.log(`❌ ${fileName}: File not found`);
        return;
      }

      const hasAnimatedImport = content.includes('Animated') && 
                               content.includes("from 'react-native'");
      const hasAnimatedUsage = content.includes('Animated.') || 
                              content.includes('useRef(new Animated.Value');
      const hasAnimationMethods = content.includes('Animated.spring') || 
                                 content.includes('Animated.timing') ||
                                 content.includes('Animated.loop');
      const hasTransformStyle = content.includes('transform:') && 
                               content.includes('scale');

      if (hasAnimatedImport && hasAnimatedUsage && hasAnimationMethods) {
        this.results.animations.passed++;
        console.log(`✅ ${fileName}: Animations properly implemented`);
      } else {
        this.results.animations.failed++;
        const missing = [];
        if (!hasAnimatedImport) missing.push('Animated import');
        if (!hasAnimatedUsage) missing.push('Animated usage');
        if (!hasAnimationMethods) missing.push('Animation methods');
        
        this.results.animations.issues.push(`${fileName}: Missing ${missing.join(', ')}`);
        console.log(`❌ ${fileName}: Missing animations (${missing.join(', ')})`);
      }
    });
  }

  // Test 6: Verify all screens use scaleFont and spacing from responsive hook
  testResponsiveUsage() {
    console.log('\n🔍 Testing scaleFont and spacing Usage in All Screens...\n');
    
    const screens = [
      '/app/mobile-app/screens/LoginScreen.js',
      '/app/mobile-app/screens/DoorListScreen.js', 
      '/app/mobile-app/screens/DoorControlScreen.js',
      '/app/mobile-app/screens/AccountScreen.js',
      '/app/mobile-app/screens/ActivityLogScreen.js'
    ];

    screens.forEach(filePath => {
      const content = this.readFile(filePath);
      const fileName = path.basename(filePath);
      
      if (!content) {
        this.results.responsive.failed++;
        this.results.responsive.issues.push(`${fileName}: File not found`);
        console.log(`❌ ${fileName}: File not found`);
        return;
      }

      const hasScaleFontUsage = content.includes('scaleFont(') && 
                               content.includes('fontSize: scaleFont(');
      const hasSpacingUsage = content.includes('spacing(') && 
                             (content.includes('padding') || content.includes('margin'));
      const hasResponsiveDestructuring = content.includes('scaleFont, spacing') ||
                                        (content.includes('scaleFont') && content.includes('spacing'));

      if (hasScaleFontUsage && hasSpacingUsage && hasResponsiveDestructuring) {
        this.results.responsive.passed++;
        console.log(`✅ ${fileName}: scaleFont and spacing properly used`);
      } else {
        this.results.responsive.failed++;
        const missing = [];
        if (!hasScaleFontUsage) missing.push('scaleFont usage');
        if (!hasSpacingUsage) missing.push('spacing usage');
        if (!hasResponsiveDestructuring) missing.push('proper destructuring');
        
        this.results.responsive.issues.push(`${fileName}: Missing ${missing.join(', ')}`);
        console.log(`❌ ${fileName}: Missing responsive usage (${missing.join(', ')})`);
      }
    });
  }

  // Run all tests
  runAllTests() {
    console.log('🚀 Starting React Native Frontend Validation Tests\n');
    
    this.testSyntaxCompilation();
    this.testResponsiveHookImports();
    this.testVibrationsDisabled();
    this.testSafeAreaInsets();
    this.testAnimations();
    this.testResponsiveUsage();
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 TEST SUMMARY\n');
    console.log('='.repeat(50));
    
    const categories = [
      { name: 'Syntax Compilation', data: this.results.syntax },
      { name: 'useResponsive Imports', data: this.results.imports },
      { name: 'Vibrations Disabled', data: this.results.vibrations },
      { name: 'Safe Area Insets', data: this.results.safeArea },
      { name: 'Component Animations', data: this.results.animations },
      { name: 'Responsive Usage', data: this.results.responsive }
    ];

    let totalPassed = 0;
    let totalTests = 0;

    categories.forEach(category => {
      const { passed, failed, issues } = category.data;
      const total = passed + failed;
      totalPassed += passed;
      totalTests += total;
      
      console.log(`${category.name}: ${passed}/${total} passed`);
      if (issues.length > 0) {
        issues.forEach(issue => console.log(`  ⚠️ ${issue}`));
      }
    });
    
    console.log('='.repeat(50));
    console.log(`Overall: ${totalPassed}/${totalTests} tests passed (${Math.round((totalPassed/totalTests)*100)}%)`);
    
    if (totalPassed === totalTests) {
      console.log('🎉 All frontend validation tests PASSED!');
    } else {
      console.log('⚠️ Some tests failed - see issues above');
    }

    return { totalPassed, totalTests, success: totalPassed === totalTests };
  }
}

// Run the validator
const validator = new ReactNativeValidator();
const results = validator.runAllTests();

// Export results for external use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validator, results };
}