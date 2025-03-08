"use client";
import { useState } from "react";
import { GitHubUser } from "@/types/github";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Github,
  ExternalLink,
  Loader2,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Type for GitHub API response
type FetchResult<T> = {
  data: T;
  isComplete: boolean;
  error: string | null;
};

export default function Home() {
  const [username, setUsername] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [unfollowers, setUnfollowers] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenOpen, setIsTokenOpen] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [requestComplete, setRequestComplete] = useState<boolean>(false);
  const [partialResult, setPartialResult] = useState<boolean>(false);
  const [stats, setStats] = useState<{
    followers: number;
    following: number;
  } | null>(null);

  // Function to check if Link header contains a next page
  const hasNextPage = (linkHeader: string | null): boolean => {
    return linkHeader ? linkHeader.includes('rel="next"') : false;
  };

  // Function to fetch all pages of users with proper pagination
  const fetchAllUsers = async (
    type: "followers" | "following"
  ): Promise<FetchResult<GitHubUser[]>> => {
    const perPage = 100; // Maximum per page
    let allUsers: GitHubUser[] = [];
    let page = 1;
    let hasMore = true;
    let error: string | null = null;
    let isComplete = true;

    try {
      while (hasMore) {
        setProgressText(`Fetching ${type} page ${page}...`);

        const url = `https://api.github.com/users/${username}/${type}?per_page=${perPage}&page=${page}`;

        const headers: Record<string, string> = {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        };

        if (token) {
          headers.Authorization = `token ${token}`;
        }

        const response = await fetch(url, { headers });

        if (!response.ok) {
          if (response.status === 403) {
            const errorData = await response.json();
            if (
              errorData.message &&
              errorData.message.includes("API rate limit exceeded")
            ) {
              throw new Error(
                "API rate limit exceeded. Please use a personal access token for higher limits."
              );
            }
          }

          throw new Error(
            response.status === 404
              ? "User not found"
              : `Error fetching ${type} data (${response.status})`
          );
        }

        const linkHeader = response.headers.get("Link");
        const users = await response.json();
        allUsers = [...allUsers, ...users];

        // Check if there are more pages to fetch
        hasMore = hasNextPage(linkHeader);
        page++;
      }
    } catch (err) {
      error =
        err instanceof Error ? err.message : "An unexpected error occurred";
      isComplete = false;
    }

    return {
      data: allUsers,
      isComplete,
      error,
    };
  };

  // Main function to fetch unfollowers with pagination
  const fetchUnfollowers = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnfollowers([]);
    setProgress(0);
    setProgressText("Starting...");
    setRequestComplete(false);
    setPartialResult(false);
    setStats(null);

    try {
      setProgress(10);
      setProgressText("Fetching followers and following lists...");

      // Fetch both lists in parallel
      const [followersResult, followingResult] = await Promise.all([
        fetchAllUsers("followers"),
        fetchAllUsers("following"),
      ]);

      setProgress(90);
      setProgressText("Processing results...");

      // Check if either request encountered an error
      if (!followersResult.isComplete || !followingResult.isComplete) {
        setPartialResult(true);

        if (followersResult.error) {
          setError(followersResult.error);
        } else if (followingResult.error) {
          setError(followingResult.error);
        }
      }

      const followers = followersResult.data;
      const following = followingResult.data;

      const followerLogins = followers.map((user) => user.login);
      const followingLogins = following.map((user) => user.login);

      const nonMutual = followingLogins.filter(
        (user) => !followerLogins.includes(user)
      );

      console.log(followingLogins.length);
      console.log(followerLogins.length);
      console.log(nonMutual.length);

      setStats({
        followers: followers.length,
        following: following.length,
      });

      setProgress(100);
      setProgressText("Complete!");
      setUnfollowers(nonMutual);
      setRequestComplete(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Github className="h-6 w-6" />
            <CardTitle className="text-2xl">
              GitHub Unfollowers Finder
            </CardTitle>
          </div>
          <CardDescription>
            Find who doesn't follow you back on GitHub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={fetchUnfollowers} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter GitHub username"
                required
              />

              <Collapsible
                open={isTokenOpen}
                onOpenChange={setIsTokenOpen}
                className="border rounded-md"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex w-full justify-between p-2"
                    type="button"
                  >
                    <span>Personal Access Token (Optional)</span>
                    {isTokenOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Using a token allows for higher rate limits and access to
                      private data.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      GitHub Personal Access Token
                    </label>
                    <Input
                      type="password"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx"
                    />
                  </div>

                  <div className="text-sm space-y-2">
                    <p>To create a token:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Go to{" "}
                        <a
                          href="https://github.com/settings/personal-access-tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center"
                        >
                          GitHub Token Settings{" "}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </li>
                      <li>Click "Generate new token"</li>
                      <li>
                        Under "Account permissions" set "Followers: access" to
                        "read-only"
                      </li>
                    </ol>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Find Unfollowers"
              )}
            </Button>
          </form>

          {loading && (
            <div className="mt-4 space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-gray-600">
                {progressText}
              </p>
            </div>
          )}

          {partialResult && (
            <Alert className="mt-4" variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Only partial results are shown due to rate limiting or errors.
                Consider using a token for complete results.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <div className="text-red-500 mt-4 text-center">
              <p>{error}</p>
              {error.includes("API rate limit exceeded") && (
                <p className="text-sm mt-2">
                  GitHub limits the number of anonymous API requests. Consider
                  using a personal access token for higher limits.
                </p>
              )}
            </div>
          )}

          {requestComplete && stats && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-md shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Account Stats
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-white p-2 rounded border">
                    <p className="text-xs text-gray-500">Following</p>
                    <p className="text-lg font-semibold">{stats.following}</p>
                  </div>
                  <div className="bg-white p-2 rounded border">
                    <p className="text-xs text-gray-500">Followers</p>
                    <p className="text-lg font-semibold">{stats.followers}</p>
                  </div>
                </div>
              </div>

              {unfollowers.length > 0 ? (
                <div>
                  <h2 className="text-lg font-semibold mb-2">
                    Non-mutual follows ({unfollowers.length}):
                  </h2>
                  <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                    <ul className="space-y-2">
                      {unfollowers.map((user) => (
                        <li key={user}>
                          <a
                            href={`https://github.com/${user}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center"
                          >
                            {user}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 p-4 rounded-md flex items-center">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <h3 className="font-medium text-green-800">
                      All follows are mutual!
                    </h3>
                    <p className="text-sm text-green-600">
                      Everyone you follow also follows you back.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <footer className="mt-6 text-center text-sm text-gray-500">
        <p>
          This is not an official GitHub website.
        </p>
        <p>
          Found a bug?{" "}
          <a
            href="https://github.com/nonme/github-unmutual-followers/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline inline-flex items-center"
          >
            Report it on GitHub Issues
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </p>
      </footer>
    </div>
  );
}
