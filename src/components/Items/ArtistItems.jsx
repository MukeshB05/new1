import { Link } from "react-router-dom";

const getImageUrl = (image) => {
  if (!image) return "/Unknown.png";
  if (typeof image === "string") return image;
  if (Array.isArray(image)) {
    for (let index = image.length - 1; index >= 0; index -= 1) {
      const value = image[index];
      const url = typeof value === "string" ? value : value?.url || value?.link || value?.src;
      if (url) return url;
    }
  }
  return image?.url || image?.link || image?.src || image?.image_url || image?.imageUrl || "/Unknown.png";
};

const ArtistItems = (props) => {
  const name = props.name || props.title || props.artistName || props.artist_name || props.artist || "Unknown Artist";
  const id = props.id || props.artistId || props.artist_id || props.token;
  const imageUrl = getImageUrl(props.image || props.images || props.cover || props.artwork || props.thumbnail || props.image_url || props.imageUrl || props.cover_image || props.coverImage || props.album_art || props.albumArt || props.artwork_url);
  return (
    <Link to={id ? `/artists/${id}` : "/"} className="d1-artist-card w-[6.5rem] lg:w-[7.5rem] shrink-0 flex flex-col items-center gap-2 rounded-lg text-center">
      <img src={imageUrl} alt={name} className="aspect-square w-full rounded-full object-cover transition-transform duration-200 hover:scale-105" onError={(event) => { event.currentTarget.src = "/Unknown.png"; }} />
      <span className="w-full truncate text-[11px] font-medium">{name}</span>
    </Link>
  );
};

export default ArtistItems;
