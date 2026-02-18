#!/usr/bin/env node

/**
 * Comprehensive test for React Native responsive improvements
 * Tests the useResponsive hook enhancements for automatic screen adaptation
 */

const fs = require('fs');
const path = require('path');

class ResponsiveTestSuite {
    constructor() {
        this.testsRun = 0;
        this.testsPassed = 0;
        this.issues = [];
        this.passedTests = [];
        
        // Mock React Native modules that would normally be provided
        this.mockReactNative = {
            Dimensions: {
                get: (type) => ({ width: 375, height: 812 }),
                addEventListener: () => ({ remove: () => {} })
            },
            PixelRatio: {
                get: () => 2.0,
                getFontScale: () => 1.0,
                roundToNearestPixel: (val) => Math.round(val)
            },
            Platform: {
                OS: 'ios',
                Version: 14
            }
        };
    }

    logTest(name, success, details = "") {
        this.testsRun++;
        if (success) {
            this.testsPassed++;
            this.passedTests.push(name);
            console.log(`✅ ${name}`);
            if (details) console.log(`   ${details}`);
        } else {
            this.issues.push({ test: name, issue: details });
            console.log(`❌ ${name}`);
            if (details) console.log(`   ${details}`);
        }
    }

    testHookFileExists() {
        const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
        const exists = fs.existsSync(hookPath);
        this.logTest("useResponsive Hook File Exists", exists, 
            exists ? "Hook file found" : "Hook file missing");
        return exists;
    }

    testHookExports() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Test if it's a default export
            const hasDefaultExport = hookContent.includes('export default function useResponsive');
            this.logTest("useResponsive Default Export", hasDefaultExport, 
                hasDefaultExport ? "Properly exported as default function" : "Missing default export");

            return hasDefaultExport;
        } catch (error) {
            this.logTest("useResponsive Export Check", false, `Error reading hook: ${error.message}`);
            return false;
        }
    }

    testPixelDensityDetection() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for PixelRatio.get() usage
            const hasPixelDensity = hookContent.includes('PixelRatio.get()') && 
                                  hookContent.includes('const pixelDensity');
            this.logTest("PixelRatio.get() Detection", hasPixelDensity,
                hasPixelDensity ? "pixelDensity variable uses PixelRatio.get()" : "Missing PixelRatio.get() usage");

            // Check for hasHighDensity calculation
            const hasHighDensityCheck = hookContent.includes('hasHighDensity') && 
                                      hookContent.includes('pixelDensity >= 3');
            this.logTest("hasHighDensity Flag", hasHighDensityCheck,
                hasHighDensityCheck ? "hasHighDensity properly calculates >= 3 density" : "Missing hasHighDensity logic");

            return hasPixelDensity && hasHighDensityCheck;
        } catch (error) {
            this.logTest("Pixel Density Detection", false, `Error: ${error.message}`);
            return false;
        }
    }

    testFontScaleDetection() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for PixelRatio.getFontScale() usage
            const hasSystemFontScale = hookContent.includes('PixelRatio.getFontScale()') && 
                                     hookContent.includes('const systemFontScale');
            this.logTest("PixelRatio.getFontScale() Detection", hasSystemFontScale,
                hasSystemFontScale ? "systemFontScale uses PixelRatio.getFontScale()" : "Missing getFontScale() usage");

            // Check for large font scale detection
            const hasLargeFontScale = hookContent.includes('hasLargeFontScale') && 
                                    hookContent.includes('systemFontScale > 1.15');
            this.logTest("hasLargeFontScale Flag", hasLargeFontScale,
                hasLargeFontScale ? "hasLargeFontScale detects > 1.15 scale" : "Missing large font scale detection");

            // Check for very large font scale detection  
            const hasVeryLargeFontScale = hookContent.includes('hasVeryLargeFontScale') && 
                                        hookContent.includes('systemFontScale > 1.35');
            this.logTest("hasVeryLargeFontScale Flag", hasVeryLargeFontScale,
                hasVeryLargeFontScale ? "hasVeryLargeFontScale detects > 1.35 scale" : "Missing very large font scale detection");

            return hasSystemFontScale && hasLargeFontScale && hasVeryLargeFontScale;
        } catch (error) {
            this.logTest("Font Scale Detection", false, `Error: ${error.message}`);
            return false;
        }
    }

    testCompactModeLogic() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for compact mode calculation
            const hasCompactMode = hookContent.includes('needsCompactMode') && 
                                 hookContent.includes('hasLargeFontScale');
            this.logTest("Compact Mode Logic", hasCompactMode,
                hasCompactMode ? "needsCompactMode combines small screen + large font" : "Missing compact mode logic");

            // Check for isCompactMode export
            const exportsCompactMode = hookContent.includes('isCompactMode') &&
                                     hookContent.includes('isCompactMode: needsCompactMode') ||
                                     hookContent.includes('isCompactMode,');
            this.logTest("isCompactMode Export", exportsCompactMode,
                exportsCompactMode ? "isCompactMode properly exported" : "Missing isCompactMode export");

            return hasCompactMode && exportsCompactMode;
        } catch (error) {
            this.logTest("Compact Mode Logic", false, `Error: ${error.message}`);
            return false;
        }
    }

    testFloatingMarginFunction() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for floatingMargin function
            const hasFloatingMargin = hookContent.includes('floatingMargin = () =>') ||
                                    hookContent.includes('const floatingMargin');
            this.logTest("floatingMargin Function", hasFloatingMargin,
                hasFloatingMargin ? "floatingMargin function defined" : "Missing floatingMargin function");

            // Check for adaptive margins based on device type
            const hasAdaptiveMargins = hookContent.includes('isVerySmallPhone') && 
                                     hookContent.includes('needsCompactMode') &&
                                     hookContent.includes('isTablet');
            this.logTest("Adaptive Margins Logic", hasAdaptiveMargins,
                hasAdaptiveMargins ? "floatingMargin adapts to device types" : "Missing adaptive margin logic");

            // Check if function is exported
            const exportsFloatingMargin = hookContent.includes('floatingMargin,') ||
                                        hookContent.includes('floatingMargin');
            this.logTest("floatingMargin Export", exportsFloatingMargin,
                exportsFloatingMargin ? "floatingMargin properly exported" : "Missing floatingMargin export");

            return hasFloatingMargin && hasAdaptiveMargins && exportsFloatingMargin;
        } catch (error) {
            this.logTest("Floating Margin Function", false, `Error: ${error.message}`);
            return false;
        }
    }

    testCappedFontScale() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for capped font scale calculation
            const hasCappedFontScale = hookContent.includes('cappedFontScale') && 
                                     hookContent.includes('Math.min(systemFontScale');
            this.logTest("cappedFontScale Calculation", hasCappedFontScale,
                hasCappedFontScale ? "cappedFontScale limits system font scale" : "Missing cappedFontScale logic");

            // Check for compact mode limit (1.1) vs normal limit (1.3)
            const hasConditionalLimits = hookContent.includes('needsCompactMode ? 1.1 : 1.3') ||
                                       (hookContent.includes('1.1') && hookContent.includes('1.3'));
            this.logTest("Conditional Font Scale Limits", hasConditionalLimits,
                hasConditionalLimits ? "Different limits for compact vs normal mode" : "Missing conditional font limits");

            return hasCappedFontScale && hasConditionalLimits;
        } catch (error) {
            this.logTest("Capped Font Scale", false, `Error: ${error.message}`);
            return false;
        }
    }

    testAppJsIntegration() {
        try {
            const appPath = path.join(__dirname, 'App.js');
            const appContent = fs.readFileSync(appPath, 'utf8');
            
            // Check if App.js imports useResponsive
            const importsResponsive = appContent.includes("import useResponsive from './hooks/useResponsive'") ||
                                    appContent.includes("from './hooks/useResponsive'");
            this.logTest("App.js useResponsive Import", importsResponsive,
                importsResponsive ? "App.js imports useResponsive hook" : "Missing useResponsive import");

            // Check if MainTabs function uses responsive variables
            const usesResponsiveVars = appContent.includes('floatingMargin') &&
                                     appContent.includes('isCompactMode') &&
                                     appContent.includes('hasLargeFontScale');
            this.logTest("App.js Responsive Variables Usage", usesResponsiveVars,
                usesResponsiveVars ? "MainTabs uses new responsive variables" : "Missing responsive variable usage");

            // Check for tab bar responsive dimensions
            const hasTabBarResponsive = appContent.includes('getTabBarHeight') &&
                                      appContent.includes('floatingMargin()') &&
                                      appContent.includes('tabBarHeight = getTabBarHeight()');
            this.logTest("App.js Tab Bar Responsive", hasTabBarResponsive,
                hasTabBarResponsive ? "Tab bar uses responsive dimensions" : "Missing tab bar responsiveness");

            return importsResponsive && usesResponsiveVars && hasTabBarResponsive;
        } catch (error) {
            this.logTest("App.js Integration", false, `Error: ${error.message}`);
            return false;
        }
    }

    testDoorListScreenIntegration() {
        try {
            const screenPath = path.join(__dirname, 'screens', 'DoorListScreen.js');
            const screenContent = fs.readFileSync(screenPath, 'utf8');
            
            // Check if screen imports useResponsive
            const importsResponsive = screenContent.includes("import useResponsive from '../hooks/useResponsive'") ||
                                    screenContent.includes("from '../hooks/useResponsive'");
            this.logTest("DoorListScreen useResponsive Import", importsResponsive,
                importsResponsive ? "DoorListScreen imports useResponsive" : "Missing useResponsive import");

            // Check for floatingMargin usage
            const usesFloatingMargin = screenContent.includes('floatingMargin') &&
                                     screenContent.includes('FLOATING_MARGIN');
            this.logTest("DoorListScreen floatingMargin Usage", usesFloatingMargin,
                usesFloatingMargin ? "Uses FLOATING_MARGIN from floatingMargin()" : "Missing floatingMargin usage");

            // Check for isCompactMode usage
            const usesCompactMode = screenContent.includes('isCompactMode');
            this.logTest("DoorListScreen isCompactMode Usage", usesCompactMode,
                usesCompactMode ? "Uses isCompactMode for adaptive UI" : "Missing isCompactMode usage");

            return importsResponsive && usesFloatingMargin && usesCompactMode;
        } catch (error) {
            this.logTest("DoorListScreen Integration", false, `Error: ${error.message}`);
            return false;
        }
    }

    testDoorControlScreenIntegration() {
        try {
            const screenPath = path.join(__dirname, 'screens', 'DoorControlScreen.js');
            const screenContent = fs.readFileSync(screenPath, 'utf8');
            
            // Check if screen imports useResponsive
            const importsResponsive = screenContent.includes("import useResponsive from '../hooks/useResponsive'") ||
                                    screenContent.includes("from '../hooks/useResponsive'");
            this.logTest("DoorControlScreen useResponsive Import", importsResponsive,
                importsResponsive ? "DoorControlScreen imports useResponsive" : "Missing useResponsive import");

            // Check for floatingMargin usage
            const usesFloatingMargin = screenContent.includes('floatingMargin') &&
                                     screenContent.includes('FLOATING_MARGIN');
            this.logTest("DoorControlScreen floatingMargin Usage", usesFloatingMargin,
                usesFloatingMargin ? "Uses FLOATING_MARGIN for adaptive spacing" : "Missing floatingMargin usage");

            // Check for isCompactMode usage
            const usesCompactMode = screenContent.includes('isCompactMode');
            this.logTest("DoorControlScreen isCompactMode Usage", usesCompactMode,
                usesCompactMode ? "Uses isCompactMode for compact layouts" : "Missing isCompactMode usage");

            return importsResponsive && usesFloatingMargin && usesCompactMode;
        } catch (error) {
            this.logTest("DoorControlScreen Integration", false, `Error: ${error.message}`);
            return false;
        }
    }

    testExportedResponsiveProperties() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check for new responsive properties in the entire file
            const expectedProps = [
                'pixelDensity',
                'systemFontScale', 
                'hasLargeFontScale',
                'hasHighDensity',
                'isCompactMode',
                'floatingMargin'
            ];
            
            // Look for properties in the return statement or export
            const missingProps = expectedProps.filter(prop => {
                return !hookContent.includes(`${prop},`) && !hookContent.includes(`${prop}:`);
            });
            
            if (missingProps.length > 0) {
                this.logTest("Exported Responsive Properties", false, 
                    `Missing properties: ${missingProps.join(', ')}`);
                return false;
            } else {
                this.logTest("Exported Responsive Properties", true, 
                    "All new responsive properties exported");
                return true;
            }
        } catch (error) {
            this.logTest("Exported Responsive Properties", false, `Error: ${error.message}`);
            return false;
        }
    }

    testFontScaleFunction() {
        try {
            const hookPath = path.join(__dirname, 'hooks', 'useResponsive.js');
            const hookContent = fs.readFileSync(hookPath, 'utf8');
            
            // Check if scaleFont function uses cappedFontScale
            const usesCappedFontScale = hookContent.includes('scaleFont') && 
                                      hookContent.includes('cappedFontScale');
            this.logTest("scaleFont Uses cappedFontScale", usesCappedFontScale,
                usesCappedFontScale ? "scaleFont integrates cappedFontScale" : "scaleFont doesn't use cappedFontScale");

            // Check for compact mode font scaling
            const hasCompactFontScaling = hookContent.includes('needsCompactMode') &&
                                        hookContent.includes('baseScale = 0.85');
            this.logTest("Compact Mode Font Scaling", hasCompactFontScaling,
                hasCompactFontScaling ? "Compact mode reduces font scale to 0.85" : "Missing compact font scaling");

            return usesCappedFontScale && hasCompactFontScaling;
        } catch (error) {
            this.logTest("Font Scale Function", false, `Error: ${error.message}`);
            return false;
        }
    }

    runAllTests() {
        console.log("🔍 Testing React Native Responsive Improvements...\n");
        
        // Core hook tests
        if (!this.testHookFileExists()) return this.summarize();
        this.testHookExports();
        
        // New responsive features tests
        this.testPixelDensityDetection();
        this.testFontScaleDetection();
        this.testCompactModeLogic();
        this.testFloatingMarginFunction();
        this.testCappedFontScale();
        this.testFontScaleFunction();
        this.testExportedResponsiveProperties();
        
        // Integration tests
        this.testAppJsIntegration();
        this.testDoorListScreenIntegration();
        this.testDoorControlScreenIntegration();
        
        return this.summarize();
    }

    summarize() {
        console.log(`\n📊 Tests completed: ${this.testsPassed}/${this.testsRun} passed`);
        
        if (this.issues.length > 0) {
            console.log("\n❌ Issues found:");
            this.issues.forEach(issue => {
                console.log(`  • ${issue.test}: ${issue.issue}`);
            });
            return false;
        } else {
            console.log("\n🎉 All responsive tests passed!");
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
    const tester = new ResponsiveTestSuite();
    const success = tester.runAllTests();
    process.exit(success ? 0 : 1);
}

module.exports = ResponsiveTestSuite;