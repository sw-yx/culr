import React, {
  useEffect,
  useState,
  useRef,
  useReducer,
  Fragment,
} from "react";
import { render } from "react-dom";
import { gsap } from "gsap";
import "regenerator-runtime/runtime";
import { useSupabase } from "./useSupabase.js";
import "./app.css";
const ANIM_SPEED = 0.25;

const initialState = {
  dataSet: undefined,
  searchTime: 0,
  searching: false,
  keyword: undefined,
};
const ACTIONS = {
  SEARCH_NEW: "SEARCH_NEW",
  SEARCH_RESULTS: "SEARCH_RESULTS",
  SEARCH_ERROR: "SEARCH_ERROR",
  COPY: "COPY",
};

const colorSearchReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SEARCH_NEW:
      return {
        searching: true,
        searchTime: Date.now(),
        dataSet: state.dataSet,
        keyword: action.keyword,
        error: false,
      };
    case ACTIONS.SEARCH_RESULTS:
      return {
        searching: false,
        searchTime: null,
        dataSet: action.data,
        error: false,
      };
    case ACTIONS.SEARCH_ERROR:
      return { searching: false, searchTime: null, dataSet: null, error: true };
    case ACTIONS.COPY:
      return {
        searching: false,
        searchTime: null,
        error: false,
        dataSet: state.dataSet.map((c) => ({
          ...c,
          copiedHsl: c.color.hsl === action.color,
          copiedHex: c.color.hex === action.color,
          copiedRgb:
            `rgb(${c.color.rgb.r}, ${c.color.rgb.g}, ${c.color.rgb.b})` ===
            action.color,
        })),
      };
    default:
      return state;
  }
};
const URL = "https://culr.netlify.app/.netlify/functions/culr";
const useColorSearch = () => {
  const searchResults = useRef(null);
  const [
    { searchTime, searching, dataSet, keyword, error },
    dispatch,
  ] = useReducer(colorSearchReducer, initialState);
  const grabImages = async (keyword) => {
    if (!keyword) return;
    const resp = await fetch(`${URL}/?search=${keyword}`);
    if (resp.status === 500)
      dispatch({ type: ACTIONS.SEARCH_ERROR, status: 500 });
    else {
      const data = await (await resp.json()).images;
      console.info(data);
      dispatch({ type: ACTIONS.SEARCH_RESULTS, data });
    }
  };
  useEffect(() => {
    grabImages(keyword);
  }, [searchTime]);

  const search = async (keyword) => {
    if (!keyword) return;
    searchResults.current = [];
    dispatch({ type: ACTIONS.SEARCH_NEW, keyword });
  };

  const copy = (color) => {
    // Copy to clipboard
    const input = document.createElement("input");
    input.value = color;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    dispatch({ type: ACTIONS.COPY, color });
  };
  return [dataSet, searching, search, copy, error];
};

const App = () => {
  const [keyword, setKeyword] = useState("");
  const invisiput = useRef(null);
  const colorsRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const selectedRef = useRef(null);
  const selectedImageRef = useRef(null);
  const colorRef = useRef(null);
  const formRef = useRef(null);
  const [data, searching, search, copy, error] = useColorSearch();

  const {
    createUser,
    loginUser,
    addHistory,
    history,
    deleteRow,
    logout,
    user,
  } = useSupabase();

  const unset = async () => {
    setSelected(null);
    search(keyword);
    addHistory(keyword);
  };
  const onSubmit = (e) => {
    e.preventDefault();
    if (selected) {
      closeSelected(unset);
    } else {
      unset();
    }
  };

  const copyToClipboard = (color) => {
    invisiput.current.value = color;
    invisiput.current.select();
    document.execCommand("copy");
    copy(color);
  };

  useEffect(() => {
    if (selected) {
      const colorEl = colorsRef.current.children[selected.index];
      const { top, left, bottom, right } = colorEl.getBoundingClientRect();
      const {
        top: containerTop,
        left: containerLeft,
        right: containerRight,
        bottom: containerBottom,
      } = colorsRef.current.getBoundingClientRect();

      const colorPos = {
        top: top - containerTop,
        left: left - containerLeft,
        bottom: containerBottom - bottom,
        right: containerRight - right,
      };
      colorRef.current = {
        pos: colorPos,
      };
      const onStart = () => {
        gsap.set(selectedRef.current, {
          opacity: 1,
          "--color": selected.data.color.hex,
          "--red": selected.data.color.rgb.r,
          "--green": selected.data.color.rgb.g,
          "--blue": selected.data.color.rgb.b,
          "--t": colorPos.top,
          "--r": colorPos.right,
          "--b": colorPos.bottom,
          "--l": colorPos.left,
          zIndex: 2,
        });
      };
      gsap
        .timeline({ onStart })
        .to(selectedRef.current, {
          duration: ANIM_SPEED,
          "--t": -10,
          "--r": -10,
          "--b": -10,
          "--l": -10,
        })
        .to(selectedImageRef.current, {
          duration: ANIM_SPEED,
          opacity: 1,
        });
    }
  }, [selected]);

  const closeSelected = (cb) => {
    const colorPos = colorRef.current.pos;
    const onComplete = () => {
      gsap.set(selectedRef.current, { opacity: 0, zIndex: -1 });
      if (cb && typeof cb === "function") {
        cb();
      }
    };
    gsap
      .timeline({ onComplete })
      .to(selectedImageRef.current, {
        duration: ANIM_SPEED / 2,
        opacity: 0,
      })
      .to(selectedRef.current, {
        duration: ANIM_SPEED / 2,
        "--t": colorPos.top,
        "--r": colorPos.right,
        "--b": colorPos.bottom,
        "--l": colorPos.left,
      });
  };

  function handleSignup(e) {
    e.preventDefault();
    createUser(
      e.target.parentElement.parentElement.parentElement.email.value,
      e.target.parentElement.parentElement.parentElement.password.value
    );
    // .then(clear the form)
  }
  function handleSignin(e) {
    e.preventDefault();
    loginUser(
      e.target.parentElement.parentElement.parentElement.email.value,
      e.target.parentElement.parentElement.parentElement.password.value
    );
    // .then(clear the form)
  }
  return (
    <div className="color-search">
      {user ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>{user.email}</div>
          <button type="button" onClick={logout}>
            Log out
          </button>
        </div>
      ) : (
        <form className="loginform">
          <details>
            <summary>
              <h2>Login to preserve history</h2>
            </summary>

            <label>
              Email
              <input name="email"></input>
            </label>
            <label>
              Password
              <input type="password" name="password"></input>
            </label>
            <div class="btns">
              <button type="button" onClick={handleSignup}>
                Sign up
              </button>
              <button type="submit" onClick={handleSignin}>
                Log in
              </button>
            </div>
          </details>
        </form>
      )}
      <input ref={invisiput} className="input-invisible" />
      <form ref={formRef} onSubmit={onSubmit} className="input-container">
        <input
          value={keyword}
          disabled={searching}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search for a color"
        />
        <button
          className="input-container__button"
          role="button"
          disabled={searching}
          onClick={onSubmit}
        >
          <div className="search">
            <div className="search__glass" />
            <div className="search__prongs">
              {new Array(10).fill().map((d, i) => (
                <div key={`loader-prong--${i}`} />
              ))}
            </div>
          </div>
        </button>
      </form>
      <div
        ref={colorsRef}
        className={`colors ${searching ? "colors--searching" : ""}`}
      >
        {data &&
          data.length !== 0 &&
          data.map((s, index) => (
            <div
              key={`color--${index}`}
              className="color"
              style={{
                "--color": s.color.hex,
              }}
              onClick={() => setSelected({ index, data: data[index] })}
            ></div>
          ))}
        {data && data.length !== 0 && selected && !error && (
          <div
            ref={selectedRef}
            className={`color--selected ${
              selected.data.color.dark ? "color--selected-dark" : ""
            }`}
          >
            <button className="color__close" onClick={closeSelected}>
              <svg viewBox="0 0 24 24">
                <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
              </svg>
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.hsl)}
              className="info"
            >
              {data && data[selected.index] && data[selected.index].copiedHsl
                ? "COPIED!"
                : selected.data.color.hsl}
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.hex)}
              className="info"
            >
              {data && data[selected.index] && data[selected.index].copiedHex
                ? "COPIED!"
                : selected.data.color.hex}
            </button>
            <button
              onClick={() => copyToClipboard(selected.data.color.rgb.label)}
              className="info"
            >
              {data && data[selected.index] && data[selected.index].copiedRgb
                ? "COPIED!"
                : selected.data.color.rgb.label}
            </button>
            <div className="info">
              Photo by{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://unsplash.com/@${selected.data.user.username}?utm_source=color-image-search&utm_medium=referral`}
              >
                {selected.data.user.name}
              </a>{" "}
              on{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://unsplash.com/?utm_source=color-image-search&utm_medium=referral"
              >
                Unsplash
              </a>
            </div>
            <div ref={selectedImageRef} className="img">
              <img
                className="image--loading"
                key={selected.data.id}
                alt={selected.data.alt_description}
                src={selected.data.urls.regular}
              />
            </div>
          </div>
        )}
        {data && data.length === 0 && <h2>No results! 😭</h2>}
      </div>

      <div>
        <details>
          <summary>
            <h3>History</h3>
          </summary>

          {history ? (
            <ul>
              {history.map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    className="nonbutton"
                    onClick={() => search(item)}
                  >
                    {item}
                  </button>
                  <button type="button" onClick={() => deleteRow(item)}>
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div>
              <blockquote>start typing in some searches!</blockquote>
            </div>
          )}
        </details>
      </div>
      {error && (
        <Fragment>
          <h2>Oh no! 😭</h2>
          <h3>
            Seems we hit an error. It's likely we hit the API Rate Limit for the
            hour again.
          </h3>
        </Fragment>
      )}
      <small>
        Source:{" "}
        <a href="https://github.com/sw-yx/culr">
          https://github.com/sw-yx/culr
        </a>
      </small>
    </div>
  );
};
const ROOT = document.querySelector("#app");
render(<App />, ROOT);
