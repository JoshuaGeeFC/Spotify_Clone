import { Link } from 'react-router-dom'
import { publicUrl } from '../lib/supabase'

// A list of song rows linking to each song's page.
export default function SongList({ songs }) {
  return (
    <ul className="song-list">
      {songs.map((song) => {
        const cover = publicUrl('covers', song.cover_path)
        return (
          <li key={song.id}>
            <Link to={`/songs/${song.id}`} className="song-row">
              {cover ? (
                <img className="thumb" src={cover} alt="" />
              ) : (
                <div className="thumb cover-placeholder" aria-hidden="true">♪</div>
              )}
              <span>
                <strong>{song.title}</strong>
                <br />
                {song.artist}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
