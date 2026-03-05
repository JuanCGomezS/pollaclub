import { useState } from 'react';
import type { FormEvent } from 'react';
import { registerUser, loginUser, sendPasswordReset } from '../../lib/auth';
import { getRoute } from '../../lib/utils';

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (forgotPassword) {
        await sendPasswordReset(email);
        setResetSent(true);
        return;
      }
      if (isLogin) {
        await loginUser(email, password);
        window.location.href = getRoute('/groups');
      } else {
        if (!displayName.trim()) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        try {
          localStorage.setItem('pollaRegistering', '1');
          const user = await registerUser(email, password, displayName);
          //await new Promise(resolve => setTimeout(resolve, 1000));
          localStorage.removeItem('pollaRegistering');
          window.location.href = getRoute('/groups');
        } catch (registerError: any) {
          localStorage.removeItem('pollaRegistering');
          console.error('❌ Error en registerUser:', registerError);
          throw registerError;
        }
      }
    } catch (err: any) {
      console.error('❌ Error en handleSubmit:', err);
      setError(err.message || 'Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (forgotPassword && resetSent) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-2 text-4xl" aria-hidden>⚽</div>
        <h2 className="text-2xl font-bold text-center mb-3">¡Mensaje enviado!</h2>
        <p className="text-gray-600 text-center mb-1">
          Si hay una cuenta con <strong className="text-gray-800">{email}</strong>, te llegará un correo con el enlace
          para restablecer tu contraseña.
        </p>
        <p className="text-gray-500 text-sm text-center mb-6">
          Revisa también la carpeta de spam. El enlace caduca en 1 hora.
        </p>
        <button
          type="button"
          onClick={() => {
            setForgotPassword(false);
            setResetSent(false);
            setError('');
          }}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          Volver a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">
        {forgotPassword ? 'Recuperar contraseña' : isLogin ? 'Iniciar Sesión' : 'Registrarse'}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && !forgotPassword && (
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!isLogin}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {!forgotPassword && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required={!forgotPassword}
              minLength={6}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading
            ? 'Procesando...'
            : forgotPassword
              ? 'Enviar enlace de recuperación'
              : isLogin
                ? 'Iniciar Sesión'
                : 'Registrarse'}
        </button>
      </form>

      <div className="mt-4 text-center space-y-2">
        {isLogin && !forgotPassword && (
          <div>
            <button
              type="button"
              onClick={() => {
                setForgotPassword(true);
                setError('');
              }}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        )}
        {forgotPassword ? (
          <button
            type="button"
            onClick={() => {
              setForgotPassword(false);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Volver a iniciar sesión
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            {isLogin
              ? '¿No tienes cuenta? Regístrate'
              : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        )}
      </div>
    </div>
  );
}
