const { searchSongFromAllPlatform } = require('../media_fetcher');
const searchSongsWithSongMeta = require('./search_songs_with_song_meta');
const findTheBestMatchFromWyCloud = require('./find_the_best_match_from_wycloud');

async function searchSongsWithKeyword(keyword) {
    const searchList = await searchSongFromAllPlatform({keyword});
    if (searchList === false || searchList.length === 0) {
        return [];
    }

    return searchList;
}


module.exports = {
    searchSongsWithSongMeta: searchSongsWithSongMeta,
    searchSongsWithKeyword: searchSongsWithKeyword,
    findTheBestMatchFromWyCloud: findTheBestMatchFromWyCloud,
}