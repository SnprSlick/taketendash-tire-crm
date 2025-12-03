import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function MechanicImport({ onImportSuccess }: { onImportSuccess: () => void }) {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use relative URL to leverage Next.js proxy
      const response = await fetch('/api/v1/mechanic/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${text}`);
      }

      const result = await response.json();
      
      if (result.count === 0) {
        setMessage({ type: 'error', text: result.message || 'No records imported. Check CSV format.' });
      } else {
        setMessage({ type: 'success', text: `Successfully imported ${result.count} records.` });
        setFile(null);
        onImportSuccess();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-lg font-medium mb-4">Import Mechanic Report</h2>
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-indigo-50 file:text-indigo-700
            hover:file:bg-indigo-100"
        />
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            'Uploading...'
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </>
          )}
        </button>
      </div>
      {message && (
        <div className={`mt-4 p-3 rounded-md flex items-center ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
          {message.text}
        </div>
      )}
    </div>
  );
}
