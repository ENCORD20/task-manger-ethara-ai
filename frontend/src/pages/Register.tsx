import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiJson } from '../apiClient';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = await apiJson<{ token: string; user: { id: string; username: string; role: string } }>(
        '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, role })
        },
      );

      // Save to sessionStorage
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));

      // Navigate to dashboard automatically
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#121212] relative overflow-hidden">
      {/* Register Card */}
      <div className="relative z-10 w-full max-w-md p-8 bg-[#1e1e1e] border border-[#333333] rounded-2xl shadow-xl my-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            Create Account
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Join Task Manager to get started
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-900/50 border border-red-500/50 text-white text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-white ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-all duration-300"
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="space-y-2 text-left">
            <label className="text-sm font-medium text-white ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#333333] rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-white transition-all duration-300"
              placeholder="Create a strong password"
              required
            />
          </div>

          <div className="space-y-2 text-left pt-2">
            <label className="text-sm font-medium text-white ml-1">Role</label>
            <div className="flex gap-4">
              <label className={`flex-1 relative cursor-pointer rounded-xl border ${role === 'member' ? 'border-white bg-[#2a2a2a]' : 'border-[#333333] bg-[#121212]'} p-4 transition-all duration-300 hover:border-gray-400`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="member" 
                  checked={role === 'member'} 
                  onChange={() => setRole('member')}
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-sm font-medium ${role === 'member' ? 'text-white' : 'text-gray-400'}`}>Member</span>
                </div>
              </label>

              <label className={`flex-1 relative cursor-pointer rounded-xl border ${role === 'admin' ? 'border-white bg-[#2a2a2a]' : 'border-[#333333] bg-[#121212]'} p-4 transition-all duration-300 hover:border-gray-400`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="admin" 
                  checked={role === 'admin'} 
                  onChange={() => setRole('admin')}
                  className="hidden" 
                />
                <div className="flex flex-col items-center gap-1">
                  <span className={`text-sm font-medium ${role === 'admin' ? 'text-white' : 'text-gray-400'}`}>Admin</span>
                </div>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full mt-6 bg-white text-black font-semibold py-3 px-4 rounded-xl transition-all duration-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-white hover:underline font-medium transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
