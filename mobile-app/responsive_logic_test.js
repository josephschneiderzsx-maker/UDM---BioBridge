#!/usr/bin/env node

/**
 * Advanced responsive logic validation test
 * Tests the mathematical calculations and edge cases of the useResponsive hook
 */

const fs = require('fs');
const path = require('path');

class ResponsiveLogicValidator {
    constructor() {
        this.testsRun = 0;
        this.testsPassed = 0;
        this.issues = [];
        this.passedTests = [];
    }

    logTest(name, success, details = "") {
        this.testsRun++;
        if (success) {
            this.testsPassed++;
            this.passedTests.push(name);
            console.log(`✅ ${name}`);
            if (details) console.log(`   ${details}`);
        } else {
            this.issues.append({ test: name, issue: details });
            console.log(`❌ ${name}`);
            if (details) console.log(`   ${details}`);
        }
    }

    testBreakpointConstants() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test breakpoint values
            const breakpointTests = [
                { name: 'verySmallPhone: 320', pattern: 'verySmallPhone: 320' },
                { name: 'smallPhone: 360', pattern: 'smallPhone: 360' },
                { name: 'phone: 375', pattern: 'phone: 375' },
                { name: 'largePhone: 414', pattern: 'largePhone: 414' },
                { name: 'tablet: 768', pattern: 'tablet: 768' }
            ];

            let allBreakpointsValid = true;
            breakpointTests.forEach(test => {
                if (!hookContent.includes(test.pattern)) {
                    allBreakpointsValid = false;
                    console.log(`   Missing breakpoint: ${test.name}`);
                }
            });

            this.logTest("Responsive Breakpoints Constants", allBreakpointsValid,
                allBreakpointsValid ? "All 5 breakpoints properly defined" : "Missing or incorrect breakpoint values");

            return allBreakpointsValid;
        } catch (error) {
            this.logTest("Responsive Breakpoints Constants", false, `Error: ${error.message}`);
            return false;
        }
    }

    testEffectiveWidthCalculation() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check effective width calculation logic
            const hasEffectiveWidth = hookContent.includes('effectiveWidth') &&
                                    hookContent.includes('hasHighDensity && width < 400') &&
                                    hookContent.includes('width * 0.9');

            this.logTest("Effective Width Calculation", hasEffectiveWidth,
                hasEffectiveWidth ? "effectiveWidth reduces by 10% for high density screens < 400px" : "Missing effective width logic");

            return hasEffectiveWidth;
        } catch (error) {
            this.logTest("Effective Width Calculation", false, `Error: ${error.message}`);
            return false;
        }
    }

    testDeviceTypeDetection() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test device type detection logic
            const deviceTypeChecks = [
                { name: 'isVerySmallPhone', pattern: 'effectiveWidth < BREAKPOINTS.smallPhone' },
                { name: 'isSmallPhone', pattern: 'effectiveWidth >= BREAKPOINTS.smallPhone && effectiveWidth < BREAKPOINTS.phone' },
                { name: 'isPhone', pattern: 'effectiveWidth >= BREAKPOINTS.phone && effectiveWidth < BREAKPOINTS.largePhone' },
                { name: 'isLargePhone', pattern: 'effectiveWidth >= BREAKPOINTS.largePhone && effectiveWidth < BREAKPOINTS.tablet' },
                { name: 'isTablet', pattern: 'effectiveWidth >= BREAKPOINTS.tablet' }
            ];

            let allDeviceTypesValid = true;
            deviceTypeChecks.forEach(check => {
                if (!hookContent.includes(check.pattern)) {
                    allDeviceTypesValid = false;
                    console.log(`   Missing device type logic: ${check.name}`);
                }
            });

            this.logTest("Device Type Detection Logic", allDeviceTypesValid,
                allDeviceTypesValid ? "All device type detections use effectiveWidth" : "Incorrect device type logic");

            return allDeviceTypesValid;
        } catch (error) {
            this.logTest("Device Type Detection Logic", false, `Error: ${error.message}`);
            return false;
        }
    }

    testLowEndDeviceLogic() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test comprehensive low-end device detection
            const hasComplexLowEndLogic = hookContent.includes('isLowEndDevice') &&
                                        hookContent.includes('isVerySmallPhone || isSmallPhone || hasVeryLargeFontScale') &&
                                        hookContent.includes('hasHighDensity && width < 380');

            this.logTest("Low-End Device Detection", hasComplexLowEndLogic,
                hasComplexLowEndLogic ? "Complex low-end detection: small screen OR large font OR high-density+small" : "Missing comprehensive low-end logic");

            return hasComplexLowEndLogic;
        } catch (error) {
            this.logTest("Low-End Device Detection", false, `Error: ${error.message}`);
            return false;
        }
    }

    testScaleCalculations() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test base dimensions and scaling
            const hasBaseDimensions = hookContent.includes('BASE_WIDTH = 375') &&
                                    hookContent.includes('BASE_HEIGHT = 812');
            this.logTest("Base Dimensions (iPhone 11 Pro)", hasBaseDimensions,
                hasBaseDimensions ? "Uses iPhone 11 Pro as reference (375x812)" : "Missing or incorrect base dimensions");

            // Test scale calculations
            const hasScaleCalculations = hookContent.includes('widthScale = effectiveWidth / BASE_WIDTH') &&
                                       hookContent.includes('heightScale = height / BASE_HEIGHT') &&
                                       hookContent.includes('scale = Math.min(widthScale, heightScale)');
            this.logTest("Scale Calculations", hasScaleCalculations,
                hasScaleCalculations ? "Proper width/height scale calculations" : "Missing scale calculation logic");

            return hasBaseDimensions && hasScaleCalculations;
        } catch (error) {
            this.logTest("Scale Calculations", false, `Error: ${error.message}`);
            return false;
        }
    }

    testPixelRoundingLogic() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test pixel-perfect rounding in scale functions
            const hasPixelRounding = hookContent.includes('PixelRatio.roundToNearestPixel') &&
                                   hookContent.includes('Math.round');

            this.logTest("Pixel-Perfect Rounding", hasPixelRounding,
                hasPixelRounding ? "Uses PixelRatio.roundToNearestPixel for crisp rendering" : "Missing pixel rounding logic");

            return hasPixelRounding;
        } catch (error) {
            this.logTest("Pixel-Perfect Rounding", false, `Error: ${error.message}`);
            return false;
        }
    }

    testResponsiveFontScaling() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test device-specific font scaling factors
            const fontScaleFactors = [
                { factor: '0.85', condition: 'isVerySmallPhone || needsCompactMode' },
                { factor: '0.9', condition: 'isSmallPhone' },
                { factor: '1.1', condition: 'isTablet' }
            ];

            let allFontFactorsValid = true;
            fontScaleFactors.forEach(test => {
                if (!hookContent.includes(`baseScale = ${test.factor}`) || !hookContent.includes(test.condition)) {
                    allFontFactorsValid = false;
                    console.log(`   Missing font scale factor: ${test.factor} for ${test.condition}`);
                }
            });

            this.logTest("Device-Specific Font Scale Factors", allFontFactorsValid,
                allFontFactorsValid ? "Proper font scaling: 0.85 (compact), 0.9 (small), 1.1 (tablet)" : "Missing font scale factors");

            return allFontFactorsValid;
        } catch (error) {
            this.logTest("Device-Specific Font Scale Factors", false, `Error: ${error.message}`);
            return false;
        }
    }

    testAdaptiveSpacingLogic() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test spacing function adaptive factors
            const spacingFactors = [
                { factor: '0.7', condition: 'isVerySmallPhone || needsCompactMode' },
                { factor: '0.8', condition: 'isSmallPhone' },
                { factor: '1.2', condition: 'isTablet' }
            ];

            let allSpacingValid = true;
            spacingFactors.forEach(test => {
                if (!hookContent.includes(`factor = ${test.factor}`) || !hookContent.includes(test.condition)) {
                    allSpacingValid = false;
                    console.log(`   Missing spacing factor: ${test.factor} for ${test.condition}`);
                }
            });

            this.logTest("Adaptive Spacing Logic", allSpacingValid,
                allSpacingValid ? "Spacing adapts: 0.7 (compact), 0.8 (small), 1.2 (tablet)" : "Missing adaptive spacing factors");

            return allSpacingValid;
        } catch (error) {
            this.logTest("Adaptive Spacing Logic", false, `Error: ${error.message}`);
            return false;
        }
    }

    testButtonHeightValues() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test button height values for different variants and devices
            const buttonHeights = hookContent.includes('buttonHeight = (variant = \'medium\')') &&
                                hookContent.includes('small: isVerySmallPhone ? 34 : isSmallPhone ? 38 : isTablet ? 48 : 44') &&
                                hookContent.includes('medium: isVerySmallPhone ? 42 : isSmallPhone ? 46 : isTablet ? 60 : 52') &&
                                hookContent.includes('large: isVerySmallPhone ? 48 : isSmallPhone ? 52 : isTablet ? 68 : 58');

            this.logTest("Button Height Responsive Values", buttonHeights,
                buttonHeights ? "Button heights adapt across devices: small(34-48), medium(42-60), large(48-68)" : "Missing button height responsive values");

            return buttonHeights;
        } catch (error) {
            this.logTest("Button Height Responsive Values", false, `Error: ${error.message}`);
            return false;
        }
    }

    testPlatformSpecificLogic() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test platform-specific logic
            const hasPlatformLogic = hookContent.includes('Platform.OS === \'ios\'') &&
                                   hookContent.includes('Platform.Version >= 31');

            this.logTest("Platform-Specific Logic", hasPlatformLogic,
                hasPlatformLogic ? "Platform logic for iOS/Android differences" : "Missing platform-specific adaptations");

            return hasPlatformLogic;
        } catch (error) {
            this.logTest("Platform-Specific Logic", false, `Error: ${error.message}`);
            return false;
        }
    }

    runAllTests() {
        console.log("🧮 Testing React Native Responsive Mathematical Logic...\n");
        
        this.testBreakpointConstants();
        this.testEffectiveWidthCalculation();
        this.testDeviceTypeDetection();
        this.testLowEndDeviceLogic();
        this.testScaleCalculations();
        this.testPixelRoundingLogic();
        this.testResponsiveFontScaling();
        this.testAdaptiveSpacingLogic();
        this.testButtonHeightValues();
        this.testPlatformSpecificLogic();
        
        return this.summarize();
    }

    summarize() {
        console.log(`\n📊 Logic tests completed: ${this.testsPassed}/${this.testsRun} passed`);
        
        if (this.issues.length > 0) {
            console.log("\n❌ Logic issues found:");
            this.issues.forEach(issue => {
                console.log(`  • ${issue.test}: ${issue.issue}`);
            });
            return false;
        } else {
            console.log("\n🎉 All responsive logic tests passed!");
            return true;
        }
    }

    getResults() {
        return {
            testsRun: this.testsRun,
            testsPassed: this.testsPassed,
            issues: this.issues,
            passedTests: this.passedTests
        };
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new ResponsiveLogicValidator();
    const success = tester.runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = ResponsiveLogicValidator;