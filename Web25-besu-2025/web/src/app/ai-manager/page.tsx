'use client';

import { useState, useCallback } from 'react';

export default function AIManagement() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    setIsLoading(true);
    
    try {
      // Appel direct à l'API
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          history: messages 
        })
      });

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: data.response }
      ]);

      setInput('');
    } catch (error) {
      console.error('Erreur:', error);
      setMessages(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: 'Erreur lors du traitement de votre demande.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">🤖 Besu Networks AI Management</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="h-96 overflow-y-auto mb-4 p-4 border rounded bg-gray-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-20">
              💡 Start by asking something like:<br/>
              "Create a besu network with 3 validator nodes using subnet 10.0.0.0/16"
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div key={index} className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
              <div className={`inline-block p-3 rounded-lg max-w-md ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white border shadow-sm'
              }`}>
                <div className="whitespace-pre-wrap text-sm">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="text-left mb-4">
              <div className="inline-block p-3 rounded-lg bg-gray-200 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage(input)}
            placeholder="Describe what you want to do with your Besu networks..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-green-800">✅ Example commands:</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• "Create a development network with 4 nodes"</li>
            <li>• "Add an RPC node to the mainnet-test network"</li>
            <li>• "Show the status of all my networks"</li>
            <li>• "Stop the demo network"</li>
          </ul>
        </div>
        
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-blue-800">🔧 Features:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Automatic network creation</li>
            <li>• Smart node management</li>
            <li>• Real-time monitoring</li>
            <li>• Automatic configuration</li>
          </ul>
        </div>
      </div>
    </div>
  );
}