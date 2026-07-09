import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@iconify/react'
import { DashboardLayout } from '../../components'
import {
  popupsService,
  statisticsService,
  type PopupDocument,
  type PopupDetailStatistics,
} from '../../lib/services'
import { useTimezoneStore } from '../../stores/timezoneStore'
import { formatDateInAppTimezone } from '../../lib/dateUtils'

const PopupDetails = () => {
  const { popupId } = useParams<{ popupId: string }>()
  const navigate = useNavigate()
  const { appTimezone } = useTimezoneStore()
  const [popup, setPopup] = useState<PopupDocument | null>(null)
  const [stats, setStats] = useState<PopupDetailStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!popupId) return
    const load = async () => {
      const [docRes, statsRes] = await Promise.allSettled([
        popupsService.getById(popupId),
        statisticsService.getStatistics<PopupDetailStatistics>('popups', { popupId }),
      ])
      if (docRes.status === 'fulfilled') {
        setPopup(docRes.value)
      } else {
        console.error('Error loading popup details:', docRes.reason)
        setError('Failed to load pop-up details.')
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value)
      } else {
        console.error('Error loading popup stats:', statsRes.reason)
        // leave stats null → tiles render "—"
      }
    }
    void load()
  }, [popupId])

  const statTiles = [
    { label: 'Impressions', value: stats?.totalImpressions },
    { label: 'Unique Users Shown', value: stats?.uniqueUsersShown },
    { label: 'Unique Clickers', value: stats?.uniqueClickers },
    { label: '21+ Clickers', value: stats?.clickers21Plus },
    {
      label: 'CTR',
      value: stats ? `${(stats.ctr * 100).toFixed(1)}%` : undefined,
    },
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <button
          type="button"
          onClick={() => navigate('/popups')}
          className="mb-4 flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <Icon icon="mdi:arrow-left" className="h-4 w-4" />
          Back to Pop-ups
        </button>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {popup && (
          <>
            <div className="mb-6 flex flex-col gap-6 md:flex-row">
              <img
                src={popup.imageUrl}
                alt={popup.title?.trim() || 'Untitled'}
                className="max-h-72 w-full max-w-sm rounded-xl border border-gray-200 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{popup.title?.trim() || 'Untitled'}</h1>
                <dl className="mt-3 space-y-2 text-sm text-gray-600">
                  <div>
                    <dt className="inline font-medium text-gray-800">Schedule: </dt>
                    <dd className="inline">
                      {formatDateInAppTimezone(popup.startDate, appTimezone)} –{' '}
                      {formatDateInAppTimezone(popup.endDate, appTimezone)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-gray-800">Audience: </dt>
                    <dd className="inline">{popup.targetAudience}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-gray-800">21+ only: </dt>
                    <dd className="inline">{popup.only21Plus !== false ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="inline font-medium text-gray-800">Link: </dt>
                    <dd className="inline">
                      {popup.link ? (
                        <a
                          href={popup.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1D0A74] underline"
                        >
                          {popup.link}
                        </a>
                      ) : (
                        'None (not clickable)'
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              {statTiles.map((tile) => (
                <div key={tile.label} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm text-gray-500">{tile.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{tile.value ?? '—'}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Unique counts dedupe by user across the whole campaign. CTR = unique clickers ÷
              unique users shown. “Impressions” counts one serve per user per day.
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

export default PopupDetails
