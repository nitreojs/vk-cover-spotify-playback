# vk-cover-spotify-playback

a project which renders currently playing track in your VK cover

![an example of how generated cover looks](https://i.imgur.com/0CsQrtL.png "generated cover in vk")

## features

- pretty fast render time because `skia-canvas` _(from `20`ms up to `50`ms if we omit the time it takes for pictures to
  load)_;
- beautiful-looking artists with their avatars right next to them;
- it looks beautiful in general;
- renders nice fallback avatar if the artist doesn't have one (it's real);
- it may include amount of scrobbles from last.fm if you need so;
- it may broadcast currently playing track in your status if you want so;
- yes

## installation

you will need node.js >=LTS & typescript ~v4.8.4 installed on your system i think

```shell
git clone https://github.com/nitreojs/vk-cover-spotify-playback.git # cloning repository
cd vk-cover-spotify-playback # head into it
npm install # install dependencies
npm run build # build the project
```

## setting up `.env`

in the `vk-cover-spotify-playback` folder you will find `.env.sample` file.
you will need to rename it to `.env` and fill that file before running the project itself

### spotify

1. go to [spotify dashboard applications](https://developer.spotify.com/dashboard/applications), log in & create an application
2. copy `Client ID` into `SPOTIFY_CLIENT_ID`
3. click on `SHOW CLIENT SECRET` & copy `Client Secret` into `SPOTIFY_CLIENT_SECRET`
4. click `EDIT SETTINGS` & set `Redirect URIs` to `http://localhost:8080/spotify`
5. run `npm run server`
6. go to `localhost:8080/login` & login in here
7. copy `access_token` into `SPOTIFY_ACCESS_TOKEN` & copy `refresh_token` into `SPOTIFY_REFRESH_TOKEN`

### vk

1. go to [vkhost](https://vkhost.github.io)
2. click on `Настройки »`
3. remove all rights except:
    - `Photos` (`Фотографии`), #3;
    - `Audio` (`Аудиозаписи`), #4 — _only if you are going to broadcast currently playing tracks in your status_;
    - `Access at any time` (`Доступ в любое время`), #15.
4. click on `Получить` & click `Allow`
5. copy `access_token` from the search bar into `VK_TOKEN`

### lastfm

> skip this if you don't use lastfm

> requires `use_lastfm` to be `true` in `settings.json`

1. [create an API account](https://www.last.fm/api/account/create) and get API key
2. paste it into `LASTFM_API_KEY`
3. insert your lastfm username into `LASTFM_USERNAME`

### other `.env` variables

there are also some variables that we didn't talk about. these are:

- `LOCALE`: indicates what `.json` file from `locales/` folder to use;
- `USE_LASTFM`: `true` if you are going to use Lastfm, `false` otherwise;
- `BROADCAST_TRACK_IN_STATUS`: `true` if you are going to broadcast your currently playing track in your VK status.

## fonts

if you open `src/renderer.ts` file and go to line 7, you will see that this script requires
SF UI font. well, it's actually your problem to _somehow find those fonts_, but if you manage
to find them, proceed to do next steps

1. create folder `fonts`
2. inside that folder create one more folder called `SF UI`
3. paste `.otf` files in here

if you are going to use `.ttf` files then you will have to edit line 7 in `src/renderer.ts` file

## running script

run

```shell
npm start
```

and see how your vk cover has changed

### how do i run this script constantly?

well you can do something like `crontab` for these purposes.
do however you want to, this project is not about "how to run it" but about the rendering system

### resolution other than 1920x640?

well you can theoretically change `WIDTH` and `HEIGHT` variables in `src/bot.ts` file but i wouldn't recommend
doing that since i was not properly testing the "adaptivity" of this renderer on resolutions other than 1920x640
so please stick with 1920x640 as it is the minimum possible resolution vk requires for the cover

---

even though this project is published under WTFPL license please consider leaving a link to the @starkow Telegram
channel, it means a lot to me. thanks!

<div align='center'>
  <b>created by <a href="https://t.me/starkow">t.me/starkow</a></b>
</div>
