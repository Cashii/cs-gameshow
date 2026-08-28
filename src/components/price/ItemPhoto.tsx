"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { photoFitStyle, type PhotoFit } from "@/lib/price/photo-fit";

export function ItemPhoto({
  src,
  alt,
  fit,
}: Readonly<{
  src: string;
  alt: string;
  fit?: PhotoFit;
}>) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const style: CSSProperties | undefined = fit ? photoFitStyle(fit) : undefined;

  return (
    <div className="price-photo-frame">
      {src && !failed ? (
        // Uploaded event photos are served from /api/media, not the Next image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="price-photo"
          style={style}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="price-photo-missing">No photo</div>
      )}
    </div>
  );
}
