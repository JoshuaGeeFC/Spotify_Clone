import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const MB = 1024 * 1024

// Content types the storage buckets accept, keyed by file extension.
// Used when the browser doesn't report a type (common on Windows).
const AUDIO_TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav',
  ogg: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac',
}
const IMAGE_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

function extensionOf(file) {
  return file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : ''
}

function contentTypeFor(file, allowed) {
  const byExtension = allowed[extensionOf(file)]
  if (Object.values(allowed).includes(file.type)) return file.type
  if (['audio/mp3', 'audio/x-m4a', 'audio/x-wav'].includes(file.type)) return file.type
  return byExtension ?? null
}

// Reads a song's length (in whole seconds) in the browser before uploading.
function readDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = new Audio()
    audio.preload = 'metadata'
    const done = (value) => { URL.revokeObjectURL(url); resolve(value) }
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) && audio.duration >= 1 ? Math.round(audio.duration) : null)
    audio.onerror = () => done(null)
    audio.src = url
  })
}

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [status, setStatus] = useState(null) // what's happening right now, shown on the button
  const [error, setError] = useState(null)

  // Free the preview image's memory when it changes or the page closes.
  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview) }, [coverPreview])

  function chooseCover(file) {
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // ---- check the files before uploading anything ----
    if (!audioFile) return setError('Choose an audio file.')
    const audioType = contentTypeFor(audioFile, AUDIO_TYPES)
    if (!audioType) return setError('That audio format isn\'t supported. Use MP3, M4A, WAV, OGG, WebM, AAC or FLAC.')
    if (audioFile.size > 50 * MB) return setError('Audio files can be up to 50 MB.')

    let coverType = null
    if (coverFile) {
      coverType = contentTypeFor(coverFile, IMAGE_TYPES)
      if (!coverType) return setError('Cover images must be JPG, PNG or WebP.')
      if (coverFile.size > 5 * MB) return setError('Cover images can be up to 5 MB.')
    }

    // Files are saved as <your user id>/<random id>.<ext>, which the storage
    // rules require, and avoids problems with spaces in file names.
    const audioPath = `${user.id}/${crypto.randomUUID()}.${extensionOf(audioFile) || 'audio'}`
    const coverPath = coverFile ? `${user.id}/${crypto.randomUUID()}.${extensionOf(coverFile)}` : null
    const uploaded = [] // so we can clean up if a later step fails

    try {
      setStatus('Reading song length…')
      const duration = await readDuration(audioFile)

      setStatus('Uploading audio…')
      const audioResult = await supabase.storage
        .from('audio')
        .upload(audioPath, audioFile, { contentType: audioType, upsert: false })
      if (audioResult.error) throw audioResult.error
      uploaded.push(['audio', audioPath])

      if (coverFile) {
        setStatus('Uploading cover…')
        const coverResult = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile, { contentType: coverType, upsert: false })
        if (coverResult.error) throw coverResult.error
        uploaded.push(['covers', coverPath])
      }

      setStatus('Saving song…')
      const { data, error } = await supabase
        .from('songs')
        .insert({
          uploader_id: user.id,
          title: title.trim(),
          artist: artist.trim(),
          audio_path: audioPath,
          cover_path: coverPath,
          duration_seconds: duration,
        })
        .select('id')
        .single()
      if (error) throw error

      navigate(`/songs/${data.id}`)
    } catch (err) {
      // Remove any files that made it up, so storage doesn't fill with orphans.
      await Promise.all(uploaded.map(([bucket, path]) => supabase.storage.from(bucket).remove([path])))
      setError(`Upload failed: ${err.message}`)
      setStatus(null)
    }
  }

  const busy = status !== null

  return (
    <main className="narrow">
      <h1>Upload a song</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label>
          Title
          <input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
        </label>
        <label>
          Artist
          <input required maxLength={120} value={artist} onChange={(e) => setArtist(e.target.value)} disabled={busy} />
        </label>
        <label>
          Audio file
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac,.flac"
            required
            onChange={(e) => setAudioFile(e.target.files[0] ?? null)}
            disabled={busy}
          />
          <span className="hint">MP3, M4A, WAV, OGG, WebM, AAC or FLAC, up to 50 MB.</span>
        </label>
        <label>
          Cover image (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => chooseCover(e.target.files[0] ?? null)}
            disabled={busy}
          />
          <span className="hint">JPG, PNG or WebP, up to 5 MB. Square images look best.</span>
        </label>
        {coverPreview && <img className="cover-preview" src={coverPreview} alt="Cover preview" />}

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>{status ?? 'Upload song'}</button>
      </form>
    </main>
  )
}
