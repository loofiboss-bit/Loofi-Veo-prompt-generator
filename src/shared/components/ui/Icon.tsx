import React, { memo } from 'react';
import { ICON_REGISTRY, type IconName, type IconPrimitiveElement } from './iconRegistry';

export type { IconName };

interface IconProps {
  name: IconName;
  className?: string;
}

function renderPrimitive(element: IconPrimitiveElement, index: number) {
  switch (element.tag) {
    case 'path':
      return <path key={index} {...element.props} />;
    case 'circle':
      return <circle key={index} {...element.props} />;
    case 'rect':
      return <rect key={index} {...element.props} />;
    case 'line':
      return <line key={index} {...element.props} />;
    case 'polyline':
      return <polyline key={index} {...element.props} />;
    case 'polygon':
      return <polygon key={index} {...element.props} />;
  }
}

const Icon: React.FC<IconProps> = memo(({ name, className }) => {
  const definition = ICON_REGISTRY[name];
  if (!definition) return null;

  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill={definition.fill}
      viewBox={definition.viewBox}
      strokeWidth={definition.strokeWidth}
      stroke={definition.stroke}
      aria-hidden={true}
      focusable={false}
    >
      {definition.elements.map(renderPrimitive)}
    </svg>
  );
});

Icon.displayName = 'Icon';

export default Icon;
