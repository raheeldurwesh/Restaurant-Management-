// src/components/MenuItem.jsx
// Customer-facing menu item card with image, info, and cart controls

import { useState } from 'react'
import { fmt } from '../utils/helpers'

export default function MenuItem({ item, qty, onAdd, onRemove }) {
  const [imgErr, setImgErr] = useState(false)

  return (
    <div className="card flex flex-col overflow-hidden
                    transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted
                    hover:border-amber/20 group">

      {/* Image */}
      <div className="relative h-44 bg-surface flex-shrink-0 overflow-hidden">
        {!imgErr && item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500
                       group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-raised">
            🍽️
          </div>
        )}

        {/* Category pill */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full
                         bg-base/70 backdrop-blur-sm
                         text-mid text-[10px] font-semibold uppercase tracking-wider">
          {item.category}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          <h3 className="font-body font-semibold text-bright text-base leading-snug mb-1">
            {item.name}
          </h3>
          {item.description && (
            <p className="text-mid text-xs leading-relaxed line-clamp-2">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-amber text-lg">
            {fmt(item.price)}
          </span>

          {/* Add / Qty controls */}
          {qty === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="btn-amber px-4 py-2 text-sm rounded-xl"
            >
              + Add
            </button>
          ) : (
            <div className="flex items-center gap-2 animate-scale-in">
              <button
                onClick={() => onRemove(item.id)}
                className="w-8 h-8 rounded-full border border-amber/40 text-amber
                           flex items-center justify-center text-lg font-bold
                           hover:bg-amber hover:text-base transition-all active:scale-90"
              >
                −
              </button>
              <span className="w-6 text-center font-display font-bold text-amber text-base">
                {qty}
              </span>
              <button
                onClick={() => onAdd(item)}
                className="w-8 h-8 rounded-full bg-amber text-base
                           flex items-center justify-center text-lg font-bold
                           hover:bg-amber-dim transition-all active:scale-90"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
