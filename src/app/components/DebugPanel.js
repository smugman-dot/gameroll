"use client";
import { useState, useEffect } from "react";
import { getRecommendationEngine } from "../lib/recommendationEngine";

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const engine = getRecommendationEngine();

  useEffect(() => {
    if (isOpen) {
      setProfile(engine.userProfile);
    }
  }, [isOpen]);

  const refreshProfile = () => {
    setProfile({ ...engine.userProfile });
  };

  const resetProfile = () => {
    if (confirm("Reset all learning data? This will clear your preferences.")) {
      engine.reset();
      setProfile(engine.userProfile);
    }
  };

  const topGenres = profile ?
    Object.entries(profile.genreScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) : [];

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all"
      >
        {isOpen ? "Close" : "🧠 Algorithm"}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed top-16 right-4 z-50 bg-black/90 backdrop-blur-xl text-white p-6 rounded-2xl shadow-2xl w-96 max-h-[80vh] overflow-y-auto border border-purple-500/30">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-purple-400">🧠 Algorithm Brain</h2>
            <button
              onClick={refreshProfile}
              className="text-xs bg-purple-600 px-2 py-1 rounded hover:bg-purple-700"
            >
              Refresh
            </button>
          </div>

          {profile && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="bg-purple-900/30 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-purple-300 mb-2">Learning Progress</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total Interactions:</span>
                    <span className="font-bold text-purple-400">{profile.totalInteractions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Games Seen:</span>
                    <span className="font-bold text-purple-400">{engine.seenGames.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>View History:</span>
                    <span className="font-bold text-purple-400">{profile.viewTimes.length}</span>
                  </div>
                </div>
              </div>

              {/* Top Genres */}
              <div className="bg-green-900/30 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-green-300 mb-3">Your Top Genres</h3>
                {topGenres.length > 0 ? (
                  <div className="space-y-2">
                    {topGenres.map(([slug, score], i) => (
                      <div key={slug} className="flex items-center gap-2">
                        <div className="text-lg">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🎮"}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize">{slug.replace(/-/g, ' ')}</span>
                            <span className="text-green-400 font-bold">+{score}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-400 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (score / Math.max(...topGenres.map(g => g[1]))) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Keep swiping to build your taste profile!</p>
                )}
              </div>

              {/* Skipped Genres */}
              {Object.keys(profile.skippedGenres).length > 0 && (
                <div className="bg-red-900/30 p-4 rounded-lg">
                  <h3 className="text-sm font-semibold text-red-300 mb-2">Genres You Skip</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(profile.skippedGenres)
                      .filter(([_, count]) => count > 2)
                      .map(([slug, count]) => (
                        <span key={slug} className="text-xs bg-red-500/20 px-2 py-1 rounded-full capitalize">
                          {slug.replace(/-/g, ' ')} (-{count})
                        </span>
                      ))}
                  </div>
                </div>
              )}

              {/* Recent Views */}
              <div className="bg-blue-900/30 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">Recent Activity</h3>
                <div className="space-y-2 text-xs">
                  {profile.viewTimes.slice(-5).reverse().map((view, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-gray-400">
                        {view.genres.slice(0, 2).map(g => g.replace(/-/g, ' ')).join(', ')}
                      </span>
                      <span className="text-blue-400 font-mono">
                        {view.duration.toFixed(1)}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Status */}
              <div className="bg-yellow-900/30 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-yellow-300 mb-2">Algorithm Status</h3>
                <p className="text-xs">
                  {profile.totalInteractions < 10 ? (
                    <>
                      <span className="text-yellow-400 font-bold">🌱 Learning Mode</span>
                      <br />
                      Showing diverse content to learn your taste.
                      <br />
                      {10 - profile.totalInteractions} more swipes until personalized!
                    </>
                  ) : (
                    <>
                      <span className="text-green-400 font-bold">🎯 Personalized Mode</span>
                      <br />
                      Showing 60% highly relevant, 30% medium, 10% discovery content.
                    </>
                  )}
                </p>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetProfile}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm transition-all"
              >
                🗑️ Reset Learning Data
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}