import { activityStyle } from './activityStyles';

/** Small inline pictogram, e.g. in lists and form options. */
const ActivityIcon = ({ activity, size = 16 }) => {
  const { svg, color } = activityStyle(activity);
  return (
    <svg
      className="activity-icon"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      aria-hidden="true"
      focusable="false"
      // Static, bundled markup only - never user input.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

export default ActivityIcon;
