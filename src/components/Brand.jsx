import './Brand.css';

/**
 * The mark is the letter T, so the visible word is the rest of the name.
 */
const Brand = ({ heading = false }) => {
  const Tag = heading ? 'h1' : 'div';
  return (
    <Tag className="brand" {...(heading ? { 'aria-label': 'Treklin' } : {})}>
      <img className="brand-mark" src="/treklin-logo.png" alt="" width="40" height="40" />
      <span className="brand-name">reklin</span>
    </Tag>
  );
};

export default Brand;
