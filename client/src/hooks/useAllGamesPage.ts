import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGame, getGames } from '../services/gamesService';
import { GameInstance, GameType } from '../types';

/**
 * Custom hook to manage the state and logic for the "All Games" page, including fetching games,
 * creating a new game, and navigating to game details.
 * @returns An object containing the following:
 * - `availableGames`: The list of available game instances.
 * - `handleJoin`: A function to navigate to the game details page for a selected game.
 * - `fetchGames`: A function to fetch the list of available games.
 * - `isModalOpen`: A boolean indicating whether the game creation modal is open.
 * - `handleToggleModal`: A function to toggle the visibility of the game creation modal.
 * - `handleSelectGameType`: A function to select a game type, create a new game, and close the modal.
 */
const useAllGamesPage = () => {
  const navigate = useNavigate();
  const [availableGames, setAvailableGames] = useState<GameInstance[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = async () => {
    try {
      const games = await getGames(undefined, undefined);
      setAvailableGames(games);
    } catch (err) {
      setError(`Error fetching games: ${err}`);
    }
  };

  const handleCreateGame = async (gameType: GameType) => {
    try {
      await createGame(gameType);
      await fetchGames();
    } catch (err) {
      setError(`Error creating game: ${err}`);
    }
  };

  const handleJoin = (gameID: string) => {
    navigate(`/games/${gameID}`);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleToggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleSelectGameType = (gameType: GameType) => {
    handleCreateGame(gameType);
  };

  return {
    availableGames,
    handleJoin,
    fetchGames,
    isModalOpen,
    handleToggleModal,
    handleSelectGameType,
    error,
  };
};

export default useAllGamesPage;
