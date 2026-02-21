/**
 * Detailed Feature Implementation Validation Test
 * Validates specific implementation details for the premium React Native improvements
 */

const fs = require('fs');
const path = require('path');

class DetailedFeatureValidator {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      issues: []
    };
  }

  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  test(description, condition) {
    this.results.totalTests++;
    if (condition) {
      this.results.passedTests++;
      console.log(`✅ ${description}`);
      return true;
    } else {
      this.results.failedTests++;
      this.results.issues.push(description);
      console.log(`❌ ${description}`);
      return false;
    }
  }

  runDetailedTests() {
    console.log('🔍 Running Detailed Feature Implementation Tests\n');

    // Test useResponsive hook comprehensive features
    this.testUseResponsiveHook();
    
    // Test App.js safe area implementation
    this.testAppSafeAreaImplementation();
    
    // Test component animations
    this.testComponentAnimations();
    
    // Test ActivityLogScreen vibration removal
    this.testActivityLogVibrations();
    
    // Test responsive integration across screens
    this.testResponsiveIntegration();

    this.printDetailedSummary();
    return this.results;
  }

  testUseResponsiveHook() {
    console.log('📱 Testing useResponsive Hook Implementation...\n');
    
    const content = this.readFile('/app/mobile-app/hooks/useResponsive.js');
    if (!content) {
      this.test('useResponsive hook file exists', false);
      return;
    }

    this.test('useResponsive exports pixelDensity detection', content.includes('PixelRatio.get()'));
    this.test('useResponsive exports systemFontScale detection', content.includes('PixelRatio.getFontScale()'));
    this.test('useResponsive has hasLargeFontScale flag', content.includes('hasLargeFontScale'));
    this.test('useResponsive has hasVeryLargeFontScale flag', content.includes('hasVeryLargeFontScale'));
    this.test('useResponsive has hasHighDensity calculation', content.includes('hasHighDensity'));
    this.test('useResponsive has needsCompactMode logic', content.includes('needsCompactMode'));
    this.test('useResponsive exports isCompactMode', content.includes('isCompactMode'));
    this.test('useResponsive has floatingMargin function', content.includes('floatingMargin'));
    this.test('useResponsive has cappedFontScale limiting', content.includes('cappedFontScale'));
    this.test('useResponsive implements device type detection', 
      content.includes('isVerySmallPhone') && 
      content.includes('isSmallPhone') && 
      content.includes('isTablet'));
    this.test('useResponsive has proper breakpoint constants', 
      content.includes('verySmallPhone: 320') && 
      content.includes('tablet: 768'));
  }

  testAppSafeAreaImplementation() {
    console.log('\n📱 Testing App.js Safe Area Implementation...\n');
    
    const content = this.readFile('/app/mobile-app/App.js');
    if (!content) {
      this.test('App.js file exists', false);
      return;
    }

    this.test('App.js imports useSafeAreaInsets', content.includes('useSafeAreaInsets'));
    this.test('App.js uses insets in MainTabs', content.includes('insets = useSafeAreaInsets()'));
    this.test('App.js calculates bottom padding with insets', 
      content.includes('Math.max(insets.bottom') && content.includes('bottomPadding'));
    this.test('App.js applies bottom padding to tab bar style', 
      content.includes('paddingBottom: bottomPadding'));
    this.test('App.js has Android-specific bottom padding logic', 
      content.includes("Platform.OS === 'android'"));
    this.test('App.js includes height calculation with bottom padding', 
      content.includes('baseTabBarHeight + bottomPadding'));
  }

  testComponentAnimations() {
    console.log('\n✨ Testing Component Animations...\n');

    // Test DoorCard animations
    const doorCardContent = this.readFile('/app/mobile-app/components/DoorCard.js');
    this.test('DoorCard has scale animation import', doorCardContent?.includes('Animated'));
    this.test('DoorCard has scaleAnim ref', doorCardContent?.includes('scaleAnim'));
    this.test('DoorCard has press animations', 
      doorCardContent?.includes('handlePressIn') && doorCardContent?.includes('handlePressOut'));
    this.test('DoorCard has Animated.spring implementation', doorCardContent?.includes('Animated.spring'));
    this.test('DoorCard applies transform scale', doorCardContent?.includes('transform: [{ scale: scaleAnim }]'));

    // Test Input animations
    const inputContent = this.readFile('/app/mobile-app/components/Input.js');
    this.test('Input has border animation', inputContent?.includes('borderAnim'));
    this.test('Input has focus/blur animations', 
      inputContent?.includes('Animated.timing') && inputContent?.includes('borderColor'));
    this.test('Input has Animated.View wrapper', inputContent?.includes('Animated.View'));

    // Test PrimaryButton animations
    const buttonContent = this.readFile('/app/mobile-app/components/PrimaryButton.js');
    this.test('PrimaryButton has scale animation', buttonContent?.includes('scaleAnim'));
    this.test('PrimaryButton has press animation handlers', 
      buttonContent?.includes('handlePressIn') && buttonContent?.includes('handlePressOut'));
    this.test('PrimaryButton applies transform scale', buttonContent?.includes('transform: [{ scale: scaleAnim }]'));
  }

  testActivityLogVibrations() {
    console.log('\n📳 Testing ActivityLogScreen Vibration Removal...\n');
    
    const content = this.readFile('/app/mobile-app/screens/ActivityLogScreen.js');
    if (!content) {
      this.test('ActivityLogScreen file exists', false);
      return;
    }

    this.test('ActivityLogScreen does not import Haptics', !content.includes("import * as Haptics"));
    this.test('ActivityLogScreen does not use Haptics calls', !content.includes('Haptics.'));
    this.test('ActivityLogScreen has comment about Haptics removal', 
      content.includes('Haptics removed') || content.includes('only used for important actions'));
    this.test('ActivityLogScreen imports only necessary modules', 
      !content.includes('expo-haptics') && content.includes('react-native-safe-area-context'));
  }

  testResponsiveIntegration() {
    console.log('\n📐 Testing Responsive Integration Across Screens...\n');
    
    const screens = [
      { path: '/app/mobile-app/screens/LoginScreen.js', name: 'LoginScreen' },
      { path: '/app/mobile-app/screens/DoorListScreen.js', name: 'DoorListScreen' },
      { path: '/app/mobile-app/screens/DoorControlScreen.js', name: 'DoorControlScreen' },
      { path: '/app/mobile-app/screens/AccountScreen.js', name: 'AccountScreen' },
      { path: '/app/mobile-app/screens/ActivityLogScreen.js', name: 'ActivityLogScreen' }
    ];

    screens.forEach(({ path: screenPath, name }) => {
      const content = this.readFile(screenPath);
      if (!content) {
        this.test(`${name} file exists`, false);
        return;
      }

      this.test(`${name} imports useResponsive`, content.includes('useResponsive'));
      this.test(`${name} uses scaleFont for typography`, content.includes('scaleFont('));
      this.test(`${name} uses spacing for layout`, content.includes('spacing('));
      this.test(`${name} destructures responsive properties`, 
        content.includes('scaleFont, spacing') || 
        (content.includes('scaleFont') && content.includes('spacing')));
    });

    // Test specific features in App.js
    const appContent = this.readFile('/app/mobile-app/App.js');
    this.test('App.js MainTabs uses responsive variables', 
      appContent?.includes('isSmallPhone, isVerySmallPhone, isTablet') &&
      appContent?.includes('scaleFont, iconSize'));
    this.test('App.js calculates responsive tab bar dimensions', 
      appContent?.includes('baseTabBarHeight') && 
      appContent?.includes('isVerySmallPhone ? 50 : isSmallPhone ? 54'));
  }

  printDetailedSummary() {
    console.log('\n📊 DETAILED TEST SUMMARY\n');
    console.log('='.repeat(60));
    console.log(`Total Tests Run: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passedTests}`);
    console.log(`Failed: ${this.results.failedTests}`);
    console.log(`Success Rate: ${Math.round((this.results.passedTests/this.results.totalTests)*100)}%`);
    
    if (this.results.failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.issues.forEach(issue => console.log(`  • ${issue}`));
    }
    
    console.log('='.repeat(60));
    
    if (this.results.failedTests === 0) {
      console.log('🎉 ALL DETAILED VALIDATION TESTS PASSED!');
      console.log('✨ React Native app meets all premium design requirements');
    } else {
      console.log('⚠️ Some detailed validation tests failed');
    }
  }
}

// Run the detailed validator
const validator = new DetailedFeatureValidator();
const results = validator.runDetailedTests();

// Export results
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validator, results };
}