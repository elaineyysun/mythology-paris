import { Link } from 'react-router-dom';

export default function ArtworkCard({ artwork, themeSlug }) {
  return (
    <Link to={`/artwork/${artwork.id}?theme=${themeSlug}`}>
      <article className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group cursor-pointer h-full flex flex-col">
        {/* Image */}
        <div className="aspect-square bg-stone-100 overflow-hidden flex-shrink-0">
          {artwork.imageUrl ? (
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-stone-300 text-5xl select-none">🖼</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div className="p-4 flex flex-col gap-1 flex-1">
          <h3 className="font-semibold text-stone-900 text-sm leading-snug line-clamp-2">
            {artwork.title}
          </h3>
          <p className="text-stone-500 text-xs">{artwork.artist}</p>
          {artwork.date && (
            <p className="text-stone-400 text-xs">{artwork.date}</p>
          )}
          <p className="text-amber-700 text-xs font-medium mt-auto pt-2 truncate">
            {artwork.museum.name}
          </p>
        </div>
      </article>
    </Link>
  );
}
