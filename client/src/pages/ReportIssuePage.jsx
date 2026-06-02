import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiImage,
  FiLoader,
  FiMapPin,
  FiNavigation,
  FiUploadCloud,
  FiX,
  FiZap,
} from 'react-icons/fi'
import MapComponent from '../components/MapComponent'
import LoadingSpinner from '../components/LoadingSpinner'
import { reportsService } from '../services/reports'
import { getErrorMessage } from '../utils/helpers'

const UI_CATEGORIES = ['Roads', 'Water', 'Sanitation', 'Electricity', 'Traffic', 'Other']

const UI_TO_BACKEND_CATEGORY = {
  Roads: 'Road Damage',
  Water: 'Water Supply',
  Sanitation: 'Garbage',
  Electricity: 'Street Light',
  Traffic: 'Traffic',
  Other: 'Other',
}

const mapBackendOrAiCategoryToUi = (raw = '') => {
  const value = String(raw).toLowerCase()
  if (value.includes('road')) return 'Roads'
  if (value.includes('water')) return 'Water'
  if (value.includes('sanitation') || value.includes('garbage') || value.includes('sewage')) return 'Sanitation'
  if (value.includes('electric') || value.includes('street light')) return 'Electricity'
  if (value.includes('traffic')) return 'Traffic'
  return 'Other'
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const parseBoxToPercent = (box, imageMeta) => {
  if (!box || !imageMeta.width || !imageMeta.height) return null

  const x = Number(box.x || 0)
  const y = Number(box.y || 0)
  const width = Number(box.width || box.w || 0)
  const height = Number(box.height || box.h || 0)

  if (x <= 1 && y <= 1 && width <= 1 && height <= 1) {
    return {
      left: `${x * 100}%`,
      top: `${y * 100}%`,
      width: `${width * 100}%`,
      height: `${height * 100}%`,
      label: box.label || 'object',
      confidence: Number(box.confidence || 0),
    }
  }

  return {
    left: `${(x / imageMeta.width) * 100}%`,
    top: `${(y / imageMeta.height) * 100}%`,
    width: `${(width / imageMeta.width) * 100}%`,
    height: `${(height / imageMeta.height) * 100}%`,
    label: box.label || 'object',
    confidence: Number(box.confidence || 0),
  }
}

export default function ReportIssuePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [fetchingSimilar, setFetchingSimilar] = useState(false)

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    address: '',
  })
  const [selectedImage, setSelectedImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageMeta, setImageMeta] = useState({ width: 0, height: 0 })
  const [location, setLocation] = useState(null)
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')
  const [similarIssues, setSimilarIssues] = useState([])
  const [aiResult, setAiResult] = useState({ labels: [], category: '', confidence: 0, boxes: [], source: '' })

  const descriptionLeft = Math.max(0, 300 - form.description.length)

  const detectionBoxes = useMemo(() => {
    return (aiResult.boxes || [])
      .map((box) => parseBoxToPercent(box, imageMeta))
      .filter(Boolean)
  }, [aiResult.boxes, imageMeta])

  const setCategoryFromAi = (category) => {
    const uiCategory = mapBackendOrAiCategoryToUi(category)
    setForm((prev) => ({ ...prev, category: uiCategory }))
  }

  const handleImageSelect = async (file) => {
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file')
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Image must be 5MB or smaller')
      return
    }

    const localPreview = URL.createObjectURL(file)
    setSelectedImage(file)
    setPreviewUrl(localPreview)
    setAiResult({ labels: [], category: '', confidence: 0, boxes: [], source: '' })

    const img = new Image()
    img.onload = () => setImageMeta({ width: img.naturalWidth, height: img.naturalHeight })
    img.src = localPreview

    setDetecting(true)
    try {
      const detectFd = new FormData()
      detectFd.append('image', file)
      const { data } = await reportsService.detectImage(detectFd)
      const result = data.result || {}
      setAiResult({
        labels: Array.isArray(result.labels) ? result.labels : [],
        category: result.category || 'Other',
        confidence: Number(result.confidence || 0),
        boxes: Array.isArray(result.boxes) ? result.boxes : [],
        source: result.source || 'unknown',
      })
      setCategoryFromAi(result.category)
      toast.success('AI detection completed')
    } catch (err) {
      toast.error(`AI detection failed: ${getErrorMessage(err)}`)
    } finally {
      setDetecting(false)
    }
  }

  const handleFileInput = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    handleImageSelect(file)
    event.target.value = ''
  }

  const handleDrop = (event) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    handleImageSelect(file)
  }

  const removeImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedImage(null)
    setPreviewUrl('')
    setImageMeta({ width: 0, height: 0 })
    setAiResult({ labels: [], category: '', confidence: 0, boxes: [], source: '' })
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported in this browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLocation({ lat, lng })
        setManualLat(String(lat))
        setManualLng(String(lng))
        setLocating(false)
        toast.success('Current location selected')
      },
      () => {
        setLocating(false)
        toast.error('Could not detect location')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    )
  }

  const handleMapClick = useCallback((loc) => {
    setLocation(loc)
    setManualLat(String(loc.lat))
    setManualLng(String(loc.lng))
  }, [])

  const updateManualLocation = (nextLat, nextLng) => {
    const lat = parseFloat(nextLat)
    const lng = parseFloat(nextLng)

    if (Number.isNaN(lat) || Number.isNaN(lng)) return
    if (lat < -90 || lat > 90) return
    if (lng < -180 || lng > 180) return

    setLocation({ lat, lng })
  }

  useEffect(() => {
    let ignore = false

    const fetchSimilar = async () => {
      if (!location) {
        setSimilarIssues([])
        return
      }

      setFetchingSimilar(true)
      try {
        const params = {
          lat: location.lat,
          lng: location.lng,
          radius: 500,
          limit: 5,
        }

        const { data } = await reportsService.getNearbyIssues(params)
        if (!ignore) setSimilarIssues(data.reports || [])
      } catch {
        if (!ignore) setSimilarIssues([])
      } finally {
        if (!ignore) setFetchingSimilar(false)
      }
    }

    fetchSimilar()
    return () => { ignore = true }
  }, [location, form.category])

  const handleUpvoteInstead = async (issueId) => {
    try {
      await reportsService.upvote(issueId)
      toast.success('Upvoted existing nearby issue')
      navigate(`/reports/${issueId}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const submitIssue = async (event) => {
    event.preventDefault()

    if (!location) {
      toast.error('Please select a location')
      return
    }

    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    if (!form.description.trim()) {
      toast.error('Description is required')
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title.trim())
      fd.append('description', form.description.trim())
      fd.append('latitude', String(location.lat))
      fd.append('longitude', String(location.lng))
      fd.append('address', form.address.trim())
      fd.append('category', UI_TO_BACKEND_CATEGORY[form.category || 'Other'])

      if (selectedImage) {
        fd.append('images', selectedImage)
      }

      const { data } = await reportsService.create(fd)
      toast.success('Issue reported successfully')
      navigate(`/reports/${data.report._id}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 bg-[#0B1220]">
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-ink-50">Report Issue</h1>
        <p className="text-ink-400 text-sm mt-1">AI-assisted civic issue reporting for faster city response</p>
      </div>

      <form onSubmit={submitIssue} className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <section className="xl:col-span-3 space-y-5">
          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-4">Issue Details</h2>
            <div className="space-y-4">
              <div>
                <label className="label mb-2 block">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter issue title"
                  className="input-field"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <label className="label mb-2 block">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                  className={`input-field ${aiResult.category ? 'ring-1 ring-civic-500/40' : ''}`}
                >
                  <option value="">Select category</option>
                  {UI_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                {aiResult.category && (
                  <p className="text-xs text-civic-400 mt-1">AI auto-filled category, you can override manually.</p>
                )}
              </div>

              <div>
                <label className="label mb-2 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value.slice(0, 300) }))}
                  placeholder="Describe the issue clearly..."
                  rows={4}
                  maxLength={300}
                  className="input-field resize-none"
                  required
                />
                <p className="text-xs text-ink-500 mt-1 text-right">{descriptionLeft} characters left</p>
              </div>
            </div>
          </div>

          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-4">Upload Image</h2>
            <div
              className="border-2 border-dashed border-ink-600 hover:border-civic-500 rounded-2xl p-6 text-center transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FiUploadCloud className="mx-auto text-civic-400 mb-3" size={28} />
              <p className="text-ink-300 text-sm">Drag and drop image here or click to upload</p>
              <p className="text-ink-500 text-xs mt-1">Max size: 5MB</p>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileInput} />
            </div>

            {selectedImage && (
              <div className="mt-4 bg-ink-900/60 border border-ink-700 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FiImage className="text-civic-400" />
                  <div>
                    <p className="text-ink-200 text-sm font-semibold">{selectedImage.name}</p>
                    <p className="text-ink-500 text-xs">{(selectedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={removeImage} className="w-8 h-8 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 flex items-center justify-center">
                  <FiX size={15} />
                </button>
              </div>
            )}

            <div className="mt-4">
              {detecting ? (
                <div className="rounded-xl border border-civic-500/30 bg-civic-500/10 p-4 flex items-center gap-3">
                  <FiLoader className="animate-spin text-civic-400" />
                  <p className="text-civic-300 text-sm">Detecting objects using AI...</p>
                </div>
              ) : aiResult.labels.length > 0 ? (
                <div className="rounded-xl border border-civic-500/30 bg-civic-500/10 p-4">
                  <p className="text-civic-300 text-sm font-semibold mb-1">AI Detected Category: {mapBackendOrAiCategoryToUi(aiResult.category)}</p>
                  <p className="text-ink-300 text-sm">Confidence: {Math.round((aiResult.confidence || 0) * 100)}%</p>
                  <p className="text-ink-400 text-sm mt-1">Objects: {aiResult.labels.join(', ')}</p>
                </div>
              ) : (
                <div className="rounded-xl border border-ink-700 bg-ink-900/40 p-4 text-ink-500 text-sm">Upload an image to run AI detection.</div>
              )}
            </div>
          </div>

          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-4">Location</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={detectLocation} disabled={locating} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
                <FiNavigation size={14} />
                {locating ? 'Locating...' : 'Use Current Location'}
              </button>
            </div>
            <div className="h-72 rounded-xl overflow-hidden border border-ink-700 mb-3">
              <MapComponent
                reports={[]}
                center={location ? [location.lat, location.lng] : [20.5937, 78.9629]}
                zoom={location ? 14 : 5}
                onSelectLocation={handleMapClick}
                selectedLocation={location}
                height="100%"
              />
            </div>

            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Address or landmark"
              className="input-field"
            />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label mb-2 block">Latitude</label>
                <input
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={manualLat}
                  onChange={(e) => {
                    const nextLat = e.target.value
                    setManualLat(nextLat)
                    updateManualLocation(nextLat, manualLng)
                  }}
                  placeholder="e.g. 26.4499"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label mb-2 block">Longitude</label>
                <input
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={manualLng}
                  onChange={(e) => {
                    const nextLng = e.target.value
                    setManualLng(nextLng)
                    updateManualLocation(manualLat, nextLng)
                  }}
                  placeholder="e.g. 80.3319"
                  className="input-field"
                />
              </div>
            </div>

            <div className="mt-2 text-xs text-ink-500">
              {location
                ? `Selected: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                : 'No location selected yet'}
            </div>

            <div className="mt-4">
              <p className="text-sm text-amber-300 font-semibold mb-2 flex items-center gap-2">
                <FiAlertTriangle /> Similar issues found nearby
              </p>
              {fetchingSimilar ? (
                <div className="py-4 flex justify-center"><LoadingSpinner /></div>
              ) : similarIssues.length === 0 ? (
                <p className="text-xs text-ink-500">No similar issues in 500 meter radius.</p>
              ) : (
                <div className="space-y-2">
                  {similarIssues.map((issue) => (
                    <div key={issue._id} className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-ink-200 truncate">{issue.title}</p>
                        <p className="text-xs text-ink-500">👍 {issue.upvoteCount || 0}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpvoteInstead(issue._id)}
                        className="btn-secondary text-xs px-3 py-1.5"
                      >
                        Upvote instead
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Link to="/dashboard" className="btn-secondary px-5 py-2.5">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary px-5 py-2.5 inline-flex items-center gap-2">
              {loading ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
              {loading ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </section>

        <aside className="xl:col-span-2 space-y-5">
          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-3">Live Preview</h2>

            <div className="rounded-xl overflow-hidden border border-ink-700 bg-ink-900/50 relative min-h-[250px]">
              {previewUrl ? (
                <div className="relative">
                  <img src={previewUrl} alt="Issue preview" className="w-full h-[260px] object-cover" />
                  {detectionBoxes.map((box, idx) => (
                    <div
                      key={`${box.label}-${idx}`}
                      className="absolute border-2 border-civic-400 bg-civic-400/10 rounded"
                      style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
                    >
                      <span className="absolute -top-6 left-0 text-[10px] bg-civic-500 text-white px-1.5 py-0.5 rounded">
                        {box.label} {box.confidence ? `${Math.round(box.confidence * 100)}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-ink-500 text-sm">Image preview will appear here</div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900/40 p-4">
              <p className="text-ink-200 font-semibold mb-2">Issue Preview Card</p>
              <p className="text-sm text-ink-300">{form.title || 'Issue title preview'}</p>
              <p className="text-xs text-ink-500 mt-1">{form.category || 'Category not selected'}</p>
              <p className="text-sm text-ink-400 mt-2">{form.description || 'Description preview'}</p>
              <div className="mt-3 text-xs text-ink-500 flex items-center gap-1.5">
                <FiMapPin size={12} />
                {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'No location yet'}
              </div>
            </div>
          </div>

          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-3">AI Detection Summary</h2>
            {detecting ? (
              <div className="space-y-2">
                <div className="h-4 bg-ink-700 rounded animate-pulse" />
                <div className="h-4 bg-ink-700 rounded animate-pulse w-5/6" />
                <div className="h-4 bg-ink-700 rounded animate-pulse w-4/6" />
              </div>
            ) : aiResult.labels.length > 0 ? (
              <div className="space-y-2 text-sm">
                <p className="text-civic-300 flex items-center gap-2"><FiZap /> Detected: {mapBackendOrAiCategoryToUi(aiResult.category)}</p>
                <p className="text-ink-300">Confidence: {Math.round((aiResult.confidence || 0) * 100)}%</p>
                <p className="text-ink-400">Objects: {aiResult.labels.join(', ')}</p>
                <p className="text-xs text-ink-500">Source: {aiResult.source || 'unknown'}</p>
              </div>
            ) : (
              <p className="text-ink-500 text-sm">No AI data yet.</p>
            )}
          </div>

          <div className="card bg-[#111827] border border-ink-700 p-5 rounded-2xl shadow-lg">
            <h2 className="text-ink-100 font-display font-semibold mb-3">Submission Tips</h2>
            <ul className="space-y-2 text-sm text-ink-400">
              <li className="flex items-start gap-2"><FiAlertTriangle className="mt-0.5 text-amber-300" /> Add a clear photo for better AI detection.</li>
              <li className="flex items-start gap-2"><FiAlertTriangle className="mt-0.5 text-amber-300" /> Select exact location to help avoid duplicate issues.</li>
              <li className="flex items-start gap-2"><FiAlertTriangle className="mt-0.5 text-amber-300" /> Keep title short and description specific.</li>
            </ul>
          </div>
        </aside>
      </form>
    </div>
  )
}
