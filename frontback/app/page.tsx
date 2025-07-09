export default function Home() {
    return (
      <div className="min-h-screen bg-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Tailwind está funcionando
          </h1>
          <p className="text-lg text-gray-600">
            Si ves estilos aplicados, todo está correcto.
          </p>
          <button className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Botón de prueba
          </button>
        </div>
      </div>
    )
  }