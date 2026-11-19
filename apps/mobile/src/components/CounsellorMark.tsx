import Svg, { Circle, Path, Rect } from "react-native-svg";

/** Lawyer-robot mark for Counsellor AI — matches the web SVG. Lucide-shaped props for nav. */
export function CounsellorMark({
  size = 24,
  color = "currentColor",
  absoluteStrokeWidth: _absoluteStrokeWidth,
  ..._rest
}: {
  size?: number;
  color?: string;
  absoluteStrokeWidth?: boolean;
  [key: string]: unknown;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityRole="image">
      <Circle cx="12" cy="2.6" r="1.15" fill={color} opacity={0.9} />
      <Path d="M12 3.7V5.4" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <Rect
        x="5.25"
        y="5.4"
        width="13.5"
        height="10.2"
        rx="3.4"
        stroke={color}
        strokeWidth={1.5}
      />
      <Path
        d="M7.4 9.1h9.2c.55 0 1 .45 1 1v1.35c0 .55-.45 1-1 1H7.4c-.55 0-1-.45-1-1V10.1c0-.55.45-1 1-1Z"
        fill={color}
        opacity={0.18}
        stroke={color}
        strokeWidth={1.15}
      />
      <Circle cx="9.35" cy="10.75" r="0.95" fill={color} />
      <Circle cx="14.65" cy="10.75" r="0.95" fill={color} />
      <Path
        d="M5.25 10.2H4.1c-.5 0-.9.4-.9.9v1.5c0 .5.4.9.9.9H5.25"
        stroke={color}
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <Path
        d="M18.75 10.2H19.9c.5 0 .9.4.9.9v1.5c0 .5-.4.9-.9.9H18.75"
        stroke={color}
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <Path
        d="M12 15.4v2.05M8.6 17.45h6.8"
        stroke={color}
        strokeWidth={1.35}
        strokeLinecap="round"
      />
      <Path
        d="M8.6 17.45c0 .95-.7 1.7-1.55 1.7S5.5 18.4 5.5 17.45c0-.55.9-1.55 1.55-1.55s1.55 1 1.55 1.55ZM18.5 17.45c0 .95-.7 1.7-1.55 1.7s-1.55-.75-1.55-1.7c0-.55.9-1.55 1.55-1.55s1.55 1 1.55 1.55Z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <Path
        d="M9.2 21.1c.85-1.35 1.9-2 2.8-2s1.95.65 2.8 2"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}
