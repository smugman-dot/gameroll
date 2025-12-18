// Lightweight recommendation engine
class RecommendationEngine {
  constructor() {
    this.userProfile = this.loadProfile();
    this.seenGames = new Set(); // Track seen games for debug panel
  }

  loadProfile() {
    if (typeof window === "undefined") return this.getDefaultProfile();

    try {
      const saved = localStorage.getItem("gameUserProfile");
      return saved ? JSON.parse(saved) : this.getDefaultProfile();
    } catch (error) {
      return this.getDefaultProfile();
    }
  }

  getDefaultProfile() {
    return {
      genreScores: {},
      viewTimes: [],
      skippedGenres: {},
      totalInteractions: 0,
    };
  }

  saveProfile() {
    if (typeof window === "undefined") return;

    try {
      // Keep only last 30 views
      if (this.userProfile.viewTimes.length > 30) {
        this.userProfile.viewTimes = this.userProfile.viewTimes.slice(-30);
      }

      localStorage.setItem("gameUserProfile", JSON.stringify(this.userProfile));
    } catch (error) {
      console.error("Save failed:", error);
    }
  }

  recordView(game, viewDurationSeconds) {
    if (!game || !game.id) return;

    this.seenGames.add(game.id); // Track seen game
    this.userProfile.totalInteractions++;

    this.userProfile.viewTimes.push({
      gameId: game.id,
      duration: viewDurationSeconds,
      genres: game.genres?.map((g) => g.slug) || [],
    });

    // Boost genres for longer views
    if (viewDurationSeconds > 3 && game.genres) {
      game.genres.forEach((genre) => {
        const slug = genre.slug;
        this.userProfile.genreScores[slug] =
          (this.userProfile.genreScores[slug] || 0) + 2;
      });
    }

    if (viewDurationSeconds > 8 && game.genres) {
      game.genres.forEach((genre) => {
        const slug = genre.slug;
        this.userProfile.genreScores[slug] =
          (this.userProfile.genreScores[slug] || 0) + 5;
      });
    }

    this.saveProfile();
  }

  recordSkip(game) {
    if (!game || !game.id || !game.genres) return;

    this.seenGames.add(game.id); // Track seen game
    this.userProfile.totalInteractions++;

    game.genres.forEach((genre) => {
      const slug = genre.slug;
      this.userProfile.skippedGenres[slug] =
        (this.userProfile.skippedGenres[slug] || 0) + 1;
      this.userProfile.genreScores[slug] =
        (this.userProfile.genreScores[slug] || 0) - 1;
    });

    this.saveProfile();
  }

  recordGenreInterest(genreSlug) {
    if (!genreSlug) return;
    this.userProfile.genreScores[genreSlug] =
      (this.userProfile.genreScores[genreSlug] || 0) + 10;
    this.saveProfile();
  }

  getTopGenres(limit = 5) {
    return Object.entries(this.userProfile.genreScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([slug, score]) => ({ slug, score }));
  }

  reset() {
    this.userProfile = this.getDefaultProfile();
    this.seenGames.clear(); // Clear seen games
    if (typeof window !== "undefined") {
      localStorage.removeItem("gameUserProfile");
    }
  }
}

let engineInstance = null;

export function getRecommendationEngine() {
  if (!engineInstance) {
    engineInstance = new RecommendationEngine();
  }
  return engineInstance;
}

export default RecommendationEngine;
