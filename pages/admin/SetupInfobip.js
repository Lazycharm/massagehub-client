import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { CheckCircle, XCircle, Loader, ExternalLink } from 'lucide-react';

export default function SetupInfobip() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSetup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/setup/add-infobip-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Infobip Setup
          </h1>
          <p className="text-gray-600">
            Add your Infobip SMS provider with one click
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="text-2xl">Infobip Provider Configuration</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Credentials Display */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">Your Credentials</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Provider Type</label>
                  <p className="text-gray-900 font-mono">SMS</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Provider Name</label>
                  <p className="text-gray-900 font-mono">Infobip</p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">Base URL</label>
                  <p className="text-gray-900 font-mono break-all">
                    https://d9qeqv.api.infobip.com
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-600">API Key</label>
                  <p className="text-gray-900 font-mono text-sm break-all">
                    7024f97779c5fae4c85c491bd91c2ed1-28a6aae6-65f7-4a7b-989b-c7457456baa8
                  </p>
                </div>
              </div>
            </div>

            {/* Setup Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleSetup}
                disabled={loading || (result && result.success)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : result && result.success ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Setup Complete!
                  </>
                ) : (
                  <>
                    Add Infobip Provider
                  </>
                )}
              </Button>
            </div>

            {/* Result Display */}
            {result && (
              <Alert className={result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
                <AlertDescription className="ml-8">
                  <div className="space-y-3">
                    <p className={result.success ? 'text-green-800 font-semibold' : 'text-red-800 font-semibold'}>
                      {result.message || result.error}
                    </p>

                    {result.alreadyExists && (
                      <p className="text-sm text-gray-600">
                        The provider is already configured in your system.
                      </p>
                    )}

                    {result.provider && (
                      <div className="bg-white rounded p-4 space-y-2 text-sm">
                        <p><strong>Provider ID:</strong> {result.provider.id}</p>
                        {result.provider.base_url && (
                          <p><strong>Base URL:</strong> {result.provider.base_url}</p>
                        )}
                        <p><strong>Status:</strong> {result.provider.is_active ? '✅ Active' : '❌ Inactive'}</p>
                      </div>
                    )}

                    {result.connectionTest && (
                      <div className="bg-white rounded p-4 space-y-2">
                        <p className="font-semibold">Connection Test:</p>
                        <p className={result.connectionTest.success ? 'text-green-700' : 'text-red-700'}>
                          {result.connectionTest.message}
                        </p>
                      </div>
                    )}

                    {result.nextSteps && result.nextSteps.length > 0 && (
                      <div className="bg-white rounded p-4">
                        <p className="font-semibold mb-2">Next Steps:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                          {result.nextSteps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Click the button above to add Infobip provider to your database
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 2</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Go to Admin → Providers to verify and test the connection
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 3</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Add sender numbers and link to chatrooms to start sending
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Link */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <ExternalLink className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Need Help?
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Check out the complete integration guide for detailed setup instructions and troubleshooting.
                </p>
                <p className="text-xs text-blue-700">
                  📄 See: <code className="bg-blue-100 px-2 py-1 rounded">INFOBIP_INTEGRATION.md</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
