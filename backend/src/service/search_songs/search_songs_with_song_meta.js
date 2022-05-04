const logger = require('consola');
const { searchSongFromAllPlatform } = require('../media_fetcher');

module.exports = async function searchSongsWithSongMeta(songMeta = {
    songName: '',
    artist: '',
    album: '',
    duration: 0,
}, options = {
    expectArtistAkas: [], // 歌手名字，有的歌手有很多别名的，给出这些信息能够更好地排序
    allowSongsJustMatchDuration: false, // 关键信息不对的情况下，但 duration 很接近的歌曲，是否希望返回
    allowSongsNotMatchMeta: false, // 关键的 meta 信息不匹配的歌曲，是否希望返回
}) {
    // search song with the meta
    const searchList = await searchSongFromAllPlatform({
        songName:songMeta.songName,
        artist: songMeta.artist,
        album: songMeta.album
    });
    if (searchList === false || searchList.length === 0) {
        logger.error(`search song failed, songMeta: ${JSON.stringify(songMeta)}`);
        return false;
    }

    return sortOutTheSearchList(searchList, options.expectArtistAkas, {
        songName: songMeta.songName,
        duration: songMeta.duration,
    }, {
        allowSongsJustMatchDuration: options.allowSongsJustMatchDuration,
        allowSongsNotMatchMeta: options.allowSongsNotMatchMeta,
    });
}


function sortOutTheSearchList(searchList, expectArtistAkas, songMeta = {
    songName: '',
    duration: 0,
}, options = {
    allowSongsJustMatchDuration: false,
    allowSongsNotMatchMeta: false,
}) {
    let searchListfilttered = [];
    let searchListfiltterJustWithDuration = [];
    let searchListNotMatchMeta = [];

    // filter with song name, artist first
    for (const searchItem of searchList) {
        if (searchItem.cannotDownload) {
            logger.info(`song cannot download, continue. searchItem: ${JSON.stringify(searchItem)}`);
            searchListNotMatchMeta.push(searchItem);
            continue;
        }

        const durationDiff = Math.abs(searchItem.duration - songMeta.duration);
        searchItem.durationDiff = durationDiff;

        if (searchItem.duration != 0 && durationDiff > 10) {
            searchListNotMatchMeta.push(searchItem);
            continue;
        }

        if (thereAreWordNotExistFromInputButInSearchResult(['cover', '伴奏', '翻唱', 'instrumental'], searchItem.songName, songMeta.songName)) {
            logger.info(`there are word not exist from input but in search result, continue. searchItem.songName: ${searchItem.songName}, songMeta.songName: ${songMeta.songName}`);
            searchListNotMatchMeta.push(searchItem);
            continue;
        }

        if (durationDiff <= 5) {
            searchListfiltterJustWithDuration.push(searchItem);
            searchListNotMatchMeta.push(searchItem);
        }

        if (searchItem.songName.replace(' ', '').indexOf(songMeta.songName.replace(' ', '')) === -1) {
            logger.info(`songName not matched, continue. ${searchItem.songName} vs ${songMeta.songName}`);
            searchListNotMatchMeta.push(searchItem);
            continue;
        }

        if (searchItem.fromMusicPlatform && expectArtistAkas.length > 0) {
            logger.info(`should find the artist:${searchItem.artist} from ${expectArtistAkas.join(',')}`);
            if (!expectArtistAkas.find(artist => artist === searchItem.artist)) {
                logger.info(`artist not matched, continue.`);
                searchListNotMatchMeta.push(searchItem);
                continue;
            }
        }

        searchListfilttered.push(searchItem);
    }
    if (options.allowSongsJustMatchDuration) {
        searchListfiltterJustWithDuration = searchListfiltterJustWithDuration.sort((a, b) => a.durationDiff - b.durationDiff);
        searchListfilttered.push(...searchListfiltterJustWithDuration);
    }
    if (options.allowSongsNotMatchMeta) {
        searchListfilttered.push(...searchListNotMatchMeta);
    }

    // uniq with song url
    const uniqedSearchList = [];
    for (const searchItem of searchListfilttered) {
        if (uniqedSearchList.find(item => item.url === searchItem.url)) {
            continue;
        }
        uniqedSearchList.push(searchItem);
    }
 
    // stable sort。 resourceForbidden 排在后面
    return uniqedSearchList.map((data, i) => {
        return {i, data}
    }).sort((a,b)=>{
        if (a.data.resourceForbidden == b.data.resourceForbidden) {
            return a.i-b.i;
        } if (a.data.resourceForbidden) {
            return 1;
        }
        return -1
    }).map(d=> d.data)
}


function thereAreWordNotExistFromInputButInSearchResult(words, searchResultWord, inputWord) {
    searchResultWord = searchResultWord.toLowerCase();
    inputWord = inputWord.toLowerCase();
    for (const word of words) {
        if (searchResultWord.indexOf(word) !== -1 && inputWord.indexOf(word) === -1) {
            return true;
        }
    }
    return false;
}