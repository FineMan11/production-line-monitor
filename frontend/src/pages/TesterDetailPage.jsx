import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TesterDetailHeader from '../components/tester/TesterDetailHeader'
import TesterStatCards from '../components/tester/TesterStatCards'
import SessionsOverTimeChart from '../components/tester/SessionsOverTimeChart'
import ActionTagsChart from '../components/tester/ActionTagsChart'
import HardBinChart from '../components/tester/HardBinChart'
import SessionTimeline from '../components/tester/SessionTimeline'
import { getTesterAnalytics } from '../services/testerService'

export default function TesterDetailPage() {
  const { id } = useParams()
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTesterAnalytics(id)
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load station data.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Station Details" />

      <main className="px-4 py-5 sm:px-6 sm:py-6 max-w-screen-xl mx-auto">
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-white rounded-xl border border-gray-200" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0,1,2,3].map((i) => <div key={i} className="h-24 bg-white rounded-xl border border-gray-200" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-white rounded-xl border border-gray-200" />
              <div className="h-64 bg-white rounded-xl border border-gray-200" />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {!loading && data && (
          <>
            <TesterDetailHeader tester={data.tester} />

            <TesterStatCards summary={data.summary} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SessionsOverTimeChart data={data.sessions_by_month} testerId={data.tester.id} />
              <ActionTagsChart data={data.top_action_tags} />
            </div>

            {data.summary.upchuck_sessions > 0 && (
              <HardBinChart data={data.hard_bin_frequency} />
            )}

            <SessionTimeline testerId={data.tester.id} />
          </>
        )}
      </main>
    </div>
  )
}
