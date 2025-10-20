import React, {useState} from "react";

const PasswordModal: React.FC<{ isOpen: boolean; onConfirm: () => void; onCancel: () => void; }> =
    ({isOpen, onConfirm, onCancel}) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        fetch('/api/password', {
            method: 'POST',
            body: JSON.stringify({"password": password}),
        }).then(res => res.json())
            .then(data => {
                if (data.isConfirmed) {
                    onConfirm();
                    setPassword('');
                    setError('');
                } else {
                    setError('Incorrect password.');
                    setPassword('');
                }
            }).catch(error => {
            setError('Incorrect password.');
            setPassword('');
        })
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-96">
                <h2 className="text-xl font-bold mb-4 dark:text-white">Confirm Password</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Enter your password to continue.</p>

                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter password"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PasswordModal