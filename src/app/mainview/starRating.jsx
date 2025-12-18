const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  const stars = [];

  // Full stars
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <span key={`full-${i}`} className="text-[yellow]">
        ★
      </span>,
    );
  }

  // Half star
  if (hasHalfStar) {
    stars.push(
      <span
        key="half"
        className="inline-block relative text-[gray] before:content-['★'] before:text-[yellow] before:absolute before:top-0 before:left-0 before:w-1/2 before:overflow-hidden"
      >
        ★
      </span>,
    );
  }

  // Empty stars
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <span key={`empty-${i}`} className="text-[gray]">
        ★
      </span>,
    );
  }

  return <div className="flex gap-1">{stars}</div>;
};

export default StarRating;
