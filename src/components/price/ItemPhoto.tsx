"use client";

import { useEffect, useState } from "react";

export function ItemPhoto({
  src,
  alt,
}: Readonly<{
  src: string;
  alt: string;
}>) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div className="price-photo-frame">
      {src && !failed ? (
        // Uploaded event photos are served from /api/media, not the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="price-photo"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="price-photo-missing">No photo</div>
      )}
    </div>
  );
}
