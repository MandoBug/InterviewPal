'use client';



export default function Dashboard() {

  const history = [

    { date: 'Mar 25', type: 'Behavioral', status: 'Complete' },

    { date: 'Mar 18', type: 'Technical', status: 'Complete' },

    { date: 'Mar 16', type: 'Technical', status: 'Complete' },

  ];



  return (

    <div className="p-8 max-w-5xl mx-auto">

      {/* Header with Mascot placeholder */}

      <header className="flex justify-between items-center mb-10 bg-white p-4 rounded-lg shadow-sm border border-slate-100">

        <div className="flex items-center gap-3">

          <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center font-bold text-blue-900">

            🐌

          </div>

          <h1 className="text-xl font-bold text-blue-900">InterviewPal</h1>

        </div>

        <div className="text-right">

          <p className="text-sm font-medium">Welcome!</p>

        </div>

      </header>



      <h2 className="text-3xl font-bold mb-6">My Dashboard</h2>



      {/* Hero Action */}

      <div className="mb-10">

        <button

          onClick={() => window.location.href = '/interview'}

          className="w-full py-6 bg-blue-700 hover:bg-blue-800 text-white text-2xl font-bold rounded-xl shadow-lg transition-transform active:scale-95"

        >

          START AN INTERVIEW

        </button>

      </div>



      {/* Session History Grid */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">

          <h3 className="text-lg font-semibold mb-4 text-slate-500 uppercase tracking-wider">Session History</h3>

          <ul className="space-y-4">

            {history.map((session, i) => (

              <li key={i} className="flex justify-between items-center border-b pb-2 last:border-0">

                <span className="font-medium text-slate-700">{session.date} - {session.type}</span>

                <span className="text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-bold">

                  {session.status}

                </span>

              </li>

            ))}

          </ul>

        </div>



        {/* Empty Placeholder for Stats/Feedback */}

        <div className="bg-slate-100 p-6 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-slate-400 italic">

          AI Feedback Summary will appear here after your first session.

        </div>

      </div>



      <footer className="mt-20 text-center text-xs text-slate-400">

        Powered by FastAPI, PostgreSQL, and Claude AI

      </footer>

    </div>

  );

}