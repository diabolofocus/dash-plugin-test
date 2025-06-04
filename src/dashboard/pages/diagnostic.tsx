// Add this to your dashboard page for production debugging
// src/dashboard/pages/diagnostic.tsx

import React, { useState, useEffect } from 'react';
import { Page, Box, Card, Text, Button, Loader } from '@wix/design-system';

interface DiagnosticResult {
    success: boolean;
    environment: string;
    tests: Array<{
        name: string;
        status: 'PASS' | 'FAIL' | 'LOADING';
        message?: string;
        error?: string;
    }>;
    recommendations: string[];
}

export default function DiagnosticPage() {
    const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
    const [loading, setLoading] = useState(false);

    const runDiagnostic = async () => {
        setLoading(true);
        const results: DiagnosticResult = {
            success: false,
            environment: 'PRODUCTION',
            tests: [],
            recommendations: []
        };

        try {
            // Test 1: Check if we can import Wix modules
            console.log('🔍 Testing Wix module imports...');
            results.tests.push({
                name: 'Module Import',
                status: 'LOADING'
            });

            try {
                const ecomModule = await import('@wix/ecom');
                const essentialsModule = await import('@wix/essentials');

                results.tests[0] = {
                    name: 'Module Import',
                    status: 'PASS',
                    message: 'Successfully imported @wix/ecom and @wix/essentials'
                };

                console.log('✅ Module import successful');
            } catch (error) {
                results.tests[0] = {
                    name: 'Module Import',
                    status: 'FAIL',
                    error: error instanceof Error ? error.message : String(error)
                };
                results.recommendations.push('Install Wix Stores app on this site');
                console.log('❌ Module import failed:', error);
            }

            // Test 2: Check API access
            console.log('🔍 Testing API access...');
            results.tests.push({
                name: 'API Access',
                status: 'LOADING'
            });

            try {
                const ecomModule = await import('@wix/ecom');

                const testResult = await ecomModule.orders.searchOrders({
                    filter: { status: { "$ne": "INITIALIZED" } },
                    cursorPaging: { limit: 1 }
                });

                results.tests[1] = {
                    name: 'API Access',
                    status: 'PASS',
                    message: `Found ${testResult?.orders?.length || 0} orders`
                };

                console.log('✅ API access working');
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);

                results.tests[1] = {
                    name: 'API Access',
                    status: 'FAIL',
                    error: errorMsg
                };

                if (errorMsg.includes('WDE0110') || errorMsg.includes('Wix Code not enabled')) {
                    results.recommendations.push('Enable Wix Code (Velo) in site settings');
                } else if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
                    results.recommendations.push('Check app permissions and Wix Stores installation');
                } else {
                    results.recommendations.push('Verify Wix Stores app is properly installed');
                }

                console.log('❌ API access failed:', error);
            }

            // Test 3: Check elevated permissions
            console.log('🔍 Testing elevated permissions...');
            results.tests.push({
                name: 'Elevated Permissions',
                status: 'LOADING'
            });

            try {
                const ecomModule = await import('@wix/ecom');
                const essentialsModule = await import('@wix/essentials');

                const elevatedSearchOrders = essentialsModule.auth.elevate(ecomModule.orders.searchOrders);

                const testResult = await elevatedSearchOrders({
                    filter: { status: { "$ne": "INITIALIZED" } },
                    cursorPaging: { limit: 1 }
                });

                results.tests[2] = {
                    name: 'Elevated Permissions',
                    status: 'PASS',
                    message: 'Elevated permissions working correctly'
                };

                console.log('✅ Elevated permissions working');
            } catch (error) {
                results.tests[2] = {
                    name: 'Elevated Permissions',
                    status: 'FAIL',
                    error: error instanceof Error ? error.message : String(error)
                };
                results.recommendations.push('Check app permissions in Wix Dev Center');

                console.log('❌ Elevated permissions failed:', error);
            }

            // Determine overall success
            const failedTests = results.tests.filter(test => test.status === 'FAIL');
            results.success = failedTests.length === 0;

            if (!results.success) {
                results.recommendations.push('Visit Wix Dev Center to verify app installation and permissions');
            }

        } catch (error) {
            console.error('❌ Diagnostic failed:', error);
            results.tests.push({
                name: 'Diagnostic Error',
                status: 'FAIL',
                error: error instanceof Error ? error.message : String(error)
            });
        }

        setDiagnosticResult(results);
        setLoading(false);
    };

    const getEnvironmentInfo = () => {
        const hostname = window.location.hostname;
        const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
        const isDev = hostname.includes('dev') || isLocalhost;

        return {
            hostname,
            isDev,
            environment: isDev ? 'DEVELOPMENT' : 'PRODUCTION',
            userAgent: navigator.userAgent
        };
    };

    const envInfo = getEnvironmentInfo();

    return (
        <Page>
            <Page.Header
                title="Production Diagnostic"
                subtitle="Debug production environment issues"
            />
            <Page.Content>
                <Box gap="24px" direction="vertical">
                    {/* Environment Info */}
                    <Card>
                        <Card.Header title="Environment Information" />
                        <Card.Content>
                            <Box direction="vertical" gap="8px">
                                <Text>
                                    <strong>Environment:</strong> {envInfo.environment}
                                </Text>
                                <Text>
                                    <strong>Hostname:</strong> {envInfo.hostname}
                                </Text>
                                <Text>
                                    <strong>Timestamp:</strong> {new Date().toISOString()}
                                </Text>
                            </Box>
                        </Card.Content>
                    </Card>

                    {/* Diagnostic Button */}
                    <Card>
                        <Card.Header title="Run Diagnostic" />
                        <Card.Content>
                            <Box direction="vertical" gap="16px">
                                <Text>
                                    This will test your app's access to Wix APIs and identify any configuration issues.
                                </Text>
                                <Button
                                    onClick={runDiagnostic}
                                    disabled={loading}
                                    prefixIcon={loading ? <Loader size="tiny" /> : undefined}
                                >
                                    {loading ? 'Running Diagnostic...' : 'Run Diagnostic'}
                                </Button>
                            </Box>
                        </Card.Content>
                    </Card>

                    {/* Diagnostic Results */}
                    {diagnosticResult && (
                        <Card>
                            <Card.Header
                                title="Diagnostic Results"
                                suffix={
                                    <Text
                                        weight="bold"
                                        style={{
                                            color: diagnosticResult.success ? '#22c55e' : '#ef4444'
                                        }}
                                    >
                                        {diagnosticResult.success ? 'ALL TESTS PASSED' : 'ISSUES FOUND'}
                                    </Text>
                                }
                            />
                            <Card.Content>
                                <Box direction="vertical" gap="16px">
                                    {/* Test Results */}
                                    {diagnosticResult.tests.map((test, index) => (
                                        <Box key={index} direction="horizontal" align="center" gap="12px">
                                            <Box
                                                width="12px"
                                                height="12px"
                                                borderRadius="50%"
                                                style={{
                                                    backgroundColor:
                                                        test.status === 'PASS' ? '#22c55e' :
                                                            test.status === 'FAIL' ? '#ef4444' : '#6b7280'
                                                }}
                                            />
                                            <Box direction="vertical" gap="4px" style={{ flex: 1 }}>
                                                <Text weight="bold">{test.name}</Text>
                                                {test.message && <Text size="small">{test.message}</Text>}
                                                {test.error && (
                                                    <Text size="small" style={{ color: '#ef4444' }}>
                                                        Error: {test.error}
                                                    </Text>
                                                )}
                                            </Box>
                                        </Box>
                                    ))}

                                    {/* Recommendations */}
                                    {diagnosticResult.recommendations.length > 0 && (
                                        <Box direction="vertical" gap="8px">
                                            <Text weight="bold">Recommendations:</Text>
                                            {diagnosticResult.recommendations.map((rec, index) => (
                                                <Text key={index} size="small" style={{ marginLeft: '16px' }}>
                                                    • {rec}
                                                </Text>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            </Card.Content>
                        </Card>
                    )}

                    {/* Manual Troubleshooting */}
                    <Card>
                        <Card.Header title="Manual Troubleshooting Steps" />
                        <Card.Content>
                            <Box direction="vertical" gap="8px">
                                <Text weight="bold">If issues persist:</Text>
                                <Text size="small">1. Verify your app is installed on this site (Settings → Apps)</Text>
                                <Text size="small">2. Check that Wix Stores is installed on this site</Text>
                                <Text size="small">3. Ensure you've created a new app version after code changes</Text>
                                <Text size="small">4. Verify app permissions in Wix Dev Center</Text>
                                <Text size="small">5. Check browser console for additional error details</Text>
                            </Box>
                        </Card.Content>
                    </Card>
                </Box>
            </Page.Content>
        </Page>
    );
}