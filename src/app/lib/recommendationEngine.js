// Smart recommendation engine that learns user preferences
class RecommendationEngine {
    constructor() {
        this.userProfile = this.loadProfile();
        this.seenGames = new Set();
    }

    loadProfile() {
        if (typeof window === 'undefined') return this.getDefaultProfile();

        const saved = localStorage.getItem('gameUserProfile');
        return saved ? JSON.parse(saved) : this.getDefaultProfile();
    }

    getDefaultProfile() {
        return {
            genreScores: {}, // e.g. {"action": 5, "rpg": 3}
            platformScores: {},
            preferredRatingRange: [3.5, 5],
            viewTimes: [], // Track how long user viewed each game
            skippedGenres: {},
            likedGames: [],
            totalInteractions: 0,
            lastUpdated: Date.now()
        };
    }

    saveProfile() {
        if (typeof window !== 'undefined') {
            localStorage.setItem('gameUserProfile', JSON.stringify(this.userProfile));
        }
    }

    // Track when user views a game
    recordView(game, viewDurationSeconds) {
        this.seenGames.add(game.id);
        this.userProfile.totalInteractions++;

        // Track view duration (longer = more interested)
        this.userProfile.viewTimes.push({
            gameId: game.id,
            duration: viewDurationSeconds,
            rating: game.rating,
            genres: game.genres.map(g => g.slug)
        });

        // If viewed for >3 seconds, boost genre scores
        if (viewDurationSeconds > 3) {
            game.genres.forEach(genre => {
                const slug = genre.slug;
                this.userProfile.genreScores[slug] = (this.userProfile.genreScores[slug] || 0) + 2;
            });
        }

        // If viewed for >8 seconds, big boost
        if (viewDurationSeconds > 8) {
            game.genres.forEach(genre => {
                const slug = genre.slug;
                this.userProfile.genreScores[slug] = (this.userProfile.genreScores[slug] || 0) + 5;
            });
        }

        this.saveProfile();
    }

    // Track when user skips quickly (< 2 seconds)
    recordSkip(game) {
        this.seenGames.add(game.id);
        this.userProfile.totalInteractions++;

        game.genres.forEach(genre => {
            const slug = genre.slug;
            this.userProfile.skippedGenres[slug] = (this.userProfile.skippedGenres[slug] || 0) + 1;

            // Penalize genre score for skips
            this.userProfile.genreScores[slug] = (this.userProfile.genreScores[slug] || 0) - 1;
        });

        this.saveProfile();
    }

    // Track when user clicks on a genre tag
    recordGenreInterest(genreSlug) {
        this.userProfile.genreScores[genreSlug] = (this.userProfile.genreScores[genreSlug] || 0) + 10;
        this.saveProfile();
    }

    // Calculate relevance score for a game (0-100)
    scoreGame(game) {
        let score = 50; // Base score

        // Genre matching (most important factor)
        let genreScore = 0;
        let genreCount = 0;
        game.genres.forEach(genre => {
            const userScore = this.userProfile.genreScores[genre.slug] || 0;
            genreScore += userScore;
            genreCount++;
        });
        if (genreCount > 0) {
            score += (genreScore / genreCount) * 2; // Weight genre heavily
        }

        // Rating quality
        if (game.rating >= 4.5) score += 15;
        else if (game.rating >= 4.0) score += 10;
        else if (game.rating >= 3.5) score += 5;
        else if (game.rating < 3.0) score -= 10;

        // Penalize if genres were skipped before
        game.genres.forEach(genre => {
            const skipCount = this.userProfile.skippedGenres[genre.slug] || 0;
            if (skipCount > 2) score -= skipCount * 3;
        });

        // Boost newer games slightly (recency bias)
        if (game.released) {
            const releaseYear = parseInt(game.released.split('-')[0]);
            const currentYear = new Date().getFullYear();
            const yearDiff = currentYear - releaseYear;

            if (yearDiff <= 1) score += 8; // Very new
            else if (yearDiff <= 3) score += 4; // Recent
            else if (yearDiff > 10) score -= 3; // Older games slight penalty
        }

        // Prevent repetition - never show same game twice
        if (this.seenGames.has(game.id)) {
            return -1000; // Effectively removes from recommendations
        }

        return Math.max(0, Math.min(100, score)); // Clamp between 0-100
    }

    // Sort games by recommendation score
    rankGames(games) {
        return games
            .map(game => ({
                ...game,
                _score: this.scoreGame(game)
            }))
            .filter(game => game._score > 0) // Remove seen games
            .sort((a, b) => b._score - a._score);
    }

    // Get smart mix of content (like TikTok's FYP)
    getSmartFeed(allGames) {
        const ranked = this.rankGames(allGames);

        // Early in session: show diverse content to learn preferences
        if (this.userProfile.totalInteractions < 10) {
            return this.shuffleArray(ranked).slice(0, 20);
        }

        // After learning: smart mix
        // 60% highly relevant, 30% medium relevant, 10% discovery
        const feed = [];

        const high = ranked.filter(g => g._score >= 70);
        const medium = ranked.filter(g => g._score >= 50 && g._score < 70);
        const discovery = ranked.filter(g => g._score >= 30 && g._score < 50);

        // Take from each bucket
        feed.push(...this.shuffleArray(high).slice(0, 12));
        feed.push(...this.shuffleArray(medium).slice(0, 6));
        feed.push(...this.shuffleArray(discovery).slice(0, 2));

        return this.shuffleArray(feed); // Final shuffle for variety
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Get top genres user likes
    getTopGenres(limit = 5) {
        return Object.entries(this.userProfile.genreScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([slug, score]) => ({ slug, score }));
    }

    // Reset profile (for testing)
    reset() {
        this.userProfile = this.getDefaultProfile();
        this.seenGames.clear();
        this.saveProfile();
    }
}

// Singleton instance
let engineInstance = null;

export function getRecommendationEngine() {
    if (!engineInstance) {
        engineInstance = new RecommendationEngine();
    }
    return engineInstance;
}

export default RecommendationEngine;