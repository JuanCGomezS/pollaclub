import { useState } from 'react';

type PhaseId = 'before' | 'during';

const steps = [
  {
    title: '1. Crea o únete a un grupo',
    description:
      'Arma una polla con tus amigos creando un grupo nuevo o únete a uno existente con un código de invitación.',
  },
  {
    title: '2. Haz tus pronósticos',
    description:
      'Pronostica marcador de cada partido y completa los pronósticos bonus (campeón, goleador, etc.) antes de que cierren.',
  },
  {
    title: '3. Suma puntos y compite',
    description:
      'A medida que se juegan los partidos, PollaClub calcula automáticamente los puntos y actualiza la tabla de posiciones.',
  },
];

const phases: { id: PhaseId; label: string; title: string; items: string[] }[] = [
  {
    id: 'before',
    label: 'Antes del torneo',
    title: 'Lo que haces antes de que ruede el balón',
    items: [
      'Elige la competición disponible (Champions, Mundial, etc.) y crea o únete a un grupo.',
      'Pronostica todos los partidos que ya estén programados.',
      'Completa los pronósticos bonus: campeón, segundo puesto, máximo goleador, asistidor, según lo que permita tu grupo.',
      'Verifica las fechas límite: una vez que empieza un partido o se bloquea un bonus, ya no se puede editar ese pronóstico.',
    ],
  },
  {
    id: 'during',
    label: 'Durante el torneo',
    title: 'Cómo se vive mientras se juega',
    items: [
      'Los resultados de los partidos se van cargando en la plataforma.',
      'Tus puntos se calculan automáticamente según las reglas de puntaje del grupo.',
      'Puedes revisar la tabla de posiciones del grupo y ver cómo van tus amigos.',
      'Sigue haciendo pronósticos de los nuevos partidos que se habiliten mientras avanza la competición.',
    ],
  },
];

export default function HowItWorks() {
  const [activePhase, setActivePhase] = useState<PhaseId>('before');

  const currentPhase = phases.find((p) => p.id === activePhase) ?? phases[0];

  return (
    <section className="mt-10 max-w-5xl mx-auto text-left">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-center">
          ¿Cómo funciona PollaClub?
        </h2>
        <p className="text-gray-600 text-center max-w-2xl mx-auto">
          PollaClub es una plataforma para organizar pollas deportivas entre amigos. Tú pones los
          participantes, nosotros nos encargamos de los partidos, los puntos y las tablas de
          posiciones.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-10">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col h-full transition transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold">
                {index + 1}
              </span>
              <span className="text-xs uppercase tracking-wide text-blue-600 font-semibold">
                Paso {index + 1}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
            <p className="text-sm text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900">
            Lo que debe saber cada participante
          </h3>
          <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm">
            {phases.map((phase) => (
              <button
                key={phase.id}
                type="button"
                onClick={() => setActivePhase(phase.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition text-xs md:text-sm ${
                  activePhase === phase.id
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {phase.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">{currentPhase.title}</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              {currentPhase.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 space-y-2">
            <p className="font-semibold">Reglas generales de los puntos</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cada grupo define cuántos puntos se dan por acertar marcador exacto, ganador,
                diferencia de gol y pronósticos bonus.
              </li>
              <li>Los puntos se suman automáticamente cuando se carga el resultado oficial.</li>
              <li>
                No se pueden editar pronósticos de un partido que ya empezó o finalizó, ni bonus
                que ya están bloqueados.
              </li>
              <li>
                Puedes ver en cualquier momento tu posición en la tabla y comparar con tus amigos.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

