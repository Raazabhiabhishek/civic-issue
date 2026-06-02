import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import marker2x from 'leaflet/dist/images/marker-icon-2x.png'
import marker from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { CATEGORY_ICONS, timeAgo } from '../utils/helpers'

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl:       marker,
  shadowUrl:     markerShadow,
})

const PRIORITY_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
}

const getPriority = (report) => {
  const upvotes = report.upvoteCount || 0
  const ageInHours = Math.max(0, (Date.now() - new Date(report.createdAt).getTime()) / 36e5)
  const recency = Math.max(0, 72 - ageInHours)
  const statusWeight = report.status === 'Submitted' ? 16 : report.status === 'In Progress' ? 10 : 0
  const score = upvotes * 2 + recency * 0.4 + statusWeight

  if (score >= 35) return 'high'
  if (score >= 18) return 'medium'
  return 'low'
}

function createMarkerIcon(priorityLevel) {
  const color = PRIORITY_COLORS[priorityLevel] || '#22c55e'
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24s16-14 16-24C32 7.163 24.837 0 16 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
    </svg>
  `
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
  })
}

export default function MapComponent({ reports = [], center = [20.5937, 78.9629], zoom = 5, onSelectLocation, selectedLocation, height = '100%' }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const clickMarkerRef = useRef(null)

  useEffect(() => {
    if (mapInstanceRef.current) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView(center, zoom)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    mapInstanceRef.current = map

    if (onSelectLocation) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng
        onSelectLocation({ lat, lng })
        if (clickMarkerRef.current) map.removeLayer(clickMarkerRef.current)
        clickMarkerRef.current = L.marker([lat, lng]).addTo(map)
          .bindPopup(`<span style="color:#f1f5f9;font-size:12px">📍 Selected Location<br/>${lat.toFixed(5)}, ${lng.toFixed(5)}</span>`)
          .openPopup()
      })
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update markers when reports change
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (markersLayerRef.current) {
      map.removeLayer(markersLayerRef.current)
      markersLayerRef.current = null
    }

    const useClustering = reports.length > 6 && !onSelectLocation
    const layer = useClustering
      ? L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 45,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount()
          const tone = count > 15 ? '#ef4444' : count > 6 ? '#f59e0b' : '#22c55e'
          return L.divIcon({
            html: `<div style="width:38px;height:38px;border-radius:999px;background:${tone};border:2px solid rgba(15,23,42,0.8);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;box-shadow:0 0 0 4px rgba(15,23,42,0.35)">${count}</div>`,
            className: '',
            iconSize: [38, 38],
          })
        },
      })
      : L.layerGroup()

    reports.forEach((report) => {
      if (!report.location?.coordinates?.length) return
      const [lng, lat] = report.location.coordinates
      if (!lat || !lng) return

      const priority = getPriority(report)
      const icon = createMarkerIcon(priority)
      const marker = L.marker([lat, lng], { icon })
      const viewAction = report._id
        ? `<a href="/reports/${report._id}" style="font-size:11px;color:#22c55e;font-weight:600;text-decoration:none">View →</a>`
        : '<span style="font-size:11px;color:#64748b">No details</span>'

      const catIcon = CATEGORY_ICONS[report.category] || '📌'
      const popupHtml = `
        <div style="min-width:200px;max-width:240px;font-family:'DM Sans',sans-serif">
          <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:#f1f5f9;margin-bottom:8px;line-height:1.4">
            ${catIcon} ${report.title}
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;line-height:1.5">
            ${report.description?.slice(0, 80)}${report.description?.length > 80 ? '…' : ''}
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;color:#64748b">${report.category}</span>
            <span style="font-size:11px;color:#64748b">${timeAgo(report.createdAt)}</span>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-bottom:8px">Priority: <span style="color:${PRIORITY_COLORS[priority]};font-weight:700;text-transform:uppercase">${priority}</span></div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:#94a3b8">👍 ${report.upvoteCount || 0} · 💬 ${report.commentCount || 0}</span>
            ${viewAction}
          </div>
        </div>
      `

      marker.bindPopup(popupHtml, { maxWidth: 260 })
      layer.addLayer(marker)
    })

    layer.addTo(map)
    markersLayerRef.current = layer
  }, [reports])

  // Update selected location marker
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !selectedLocation) return
    if (clickMarkerRef.current) map.removeLayer(clickMarkerRef.current)
    clickMarkerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map)
    map.setView([selectedLocation.lat, selectedLocation.lng], 15)
  }, [selectedLocation])

  return (
    <div ref={mapRef} style={{ height, width: '100%', borderRadius: '0' }} />
  )
}
