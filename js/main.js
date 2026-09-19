/* ============================================================
   MASTER CHEF — Delicious Food
   main.js — All interactive scripts
   ------------------------------------------------------------
   1. Scroll reveal animations
   2. Back-to-top button
   3. Navbar search toggle
   4. Cart system (Add to Cart + counter + toast)
   5. Menu category filter + live search
   6. Contact form feedback
   7. Reservation form (live summary + validation)
   8. Newsletter subscription
   ============================================================ */
(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initScrollReveal();
    initBackToTop();
    initSearchToggle();
    initCart();
    initGallery();
    initMenuFilter();
    initContactForm();
    initReservation();
    initNewsletter();
    initVideoShowcase();
  });

  /* ----------------------------------------------------------
     1. Scroll reveal animations (IntersectionObserver)
     ---------------------------------------------------------- */
  function initScrollReveal() {
    var revealEls = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealEls.forEach(function (el) { observer.observe(el); });
  }

  /* ----------------------------------------------------------
     2. Back-to-top button
     ---------------------------------------------------------- */
  function initBackToTop() {
    var btn = document.querySelector(".back-to-top");
    if (!btn) return;

    window.addEventListener("scroll", function () {
      if (window.scrollY > 480) {
        btn.classList.add("show");
      } else {
        btn.classList.remove("show");
      }
    });

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ----------------------------------------------------------
     3. Navbar search toggle (slide-down search bar)
     ---------------------------------------------------------- */
  function initSearchToggle() {
    var searchBtn = document.getElementById("searchToggle");
    var searchBar = document.getElementById("navbarSearch");
    var searchInput = document.querySelector("#navbarSearch input");

    if (!searchBtn || !searchBar) return;

    searchBtn.addEventListener("click", function () {
      var isOpen = searchBar.classList.toggle("open");
      searchBtn.classList.toggle("active", isOpen);
      if (isOpen && searchInput) {
        setTimeout(function () { searchInput.focus(); }, 150);
      }
    });

    // Search from the navbar navigates to menu.html and filters live
    searchBar.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!searchInput || !searchInput.value.trim()) return;
      window.location.href = "menu.html?q=" + encodeURIComponent(searchInput.value.trim());
    });
  }

  /* ----------------------------------------------------------
     4. Cart system — drawer with items, quantity, remove & total
     ---------------------------------------------------------- */
  var CART_KEY = "masterChefCart";
  var CART_DRAWER_OPEN = false;

  function initCart() {
    updateBadge();

    // "Add to Cart" buttons read name + price
    document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var name = btn.getAttribute("data-add-to-cart") || "Dish";
        var price = parseFloat(btn.getAttribute("data-price")) || 0;
        addToCart(name, price);
      });
    });

    // Cart drawer events (if drawer exists on this page)
    var cartIcon = document.querySelector('.icon-btn[href="menu.html"]') ||
                   document.querySelector('.nav-actions .icon-btn');
    if (cartIcon && document.getElementById("cartDrawer")) {
      cartIcon.addEventListener("click", function (e) {
        e.preventDefault();
        openCart();
      });
    }

    var overlay = document.getElementById("cartOverlay");
    var closeBtn = document.getElementById("cartClose");
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (overlay) overlay.addEventListener("click", closeCart);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeCart();
    });

    var clearAll = document.getElementById("cartClearAll");
    if (clearAll) clearAll.addEventListener("click", clearCart);

    var checkout = document.getElementById("cartCheckout");
    if (checkout) checkout.addEventListener("click", handleCheckout);
  }

  function getCartItems() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
  }

  function getCartCount() {
    return getCartItems().reduce(function (sum, item) { return sum + (item.qty || 1); }, 0);
  }

  function getCartTotal() {
    return getCartItems().reduce(function (sum, item) {
      return sum + ((item.price || 0) * (item.qty || 1));
    }, 0);
  }

  function updateBadge() {
    var badge = document.getElementById("cartCount");
    if (!badge) return;
    badge.textContent = getCartCount();
    badge.style.display = getCartCount() === 0 ? "none" : "flex";
  }

  function bumpBadge() {
    var badge = document.getElementById("cartCount");
    if (!badge) return;
    badge.classList.add("bump");
    setTimeout(function () { badge.classList.remove("bump"); }, 400);
  }

  function addToCart(name, price) {
    var items = getCartItems();
    var existing = items.find(function (item) { return item.name === name; });

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ name: name, price: price, qty: 1 });
    }

    saveCart(items);
    updateBadge();
    bumpBadge();
    showToast(name + " added to cart!");
  }

  function removeFromCart(name) {
    var items = getCartItems().filter(function (item) { return item.name !== name; });
    saveCart(items);
    updateBadge();
    if (document.getElementById("cartDrawer")) renderCartItems();
  }

  function changeQty(name, delta) {
    var items = getCartItems();
    var item = items.find(function (it) { return it.name === name; });
    if (!item) return;

    item.qty = (item.qty || 1) + delta;
    if (item.qty <= 0) {
      items = items.filter(function (it) { return it.name !== name; });
    }
    saveCart(items);
    updateBadge();
    renderCartItems();
  }

  function clearCart() {
    saveCart([]);
    updateBadge();
    renderCartItems();
    showToast("Cart cleared.");
  }

  function renderCartItems() {
    var wrap = document.getElementById("cartItems");
    var totalEl = document.getElementById("cartTotal");
    if (!wrap) return;

    var items = getCartItems();

    if (!items.length) {
      wrap.innerHTML =
        '<div class="cart-empty">' +
          '<i class="bi bi-bag-x"></i>' +
          '<p>Your cart is empty.</p>' +
          '<a href="menu.html" class="btn btn-brand btn-sm"><i class="bi bi-egg-fried"></i> Browse Menu</a>' +
        '</div>';
      if (totalEl) totalEl.textContent = "$0.00";
      return;
    }

    var html = items.map(function (item) {
      var price = item.price || 0;
      var lineTotal = (price * item.qty).toFixed(2);
      return (
        '<div class="cart-item">' +
          '<div class="cart-item-info">' +
            '<span class="cart-item-name">' + item.name + '</span>' +
            '<span class="cart-item-price">$' + price.toFixed(2) + ' each</span>' +
          '</div>' +
          '<div class="cart-item-controls">' +
            '<div class="qty-stepper">' +
              '<button type="button" class="qty-btn" data-name="' + item.name + '" data-delta="-1" aria-label="Decrease"><i class="bi bi-dash"></i></button>' +
              '<span class="qty-val">' + item.qty + '</span>' +
              '<button type="button" class="qty-btn" data-name="' + item.name + '" data-delta="1" aria-label="Increase"><i class="bi bi-plus"></i></button>' +
            '</div>' +
            '<span class="cart-item-total">$' + lineTotal + '</span>' +
            '<button type="button" class="cart-remove" data-name="' + item.name + '" aria-label="Remove ' + item.name + '"><i class="bi bi-trash"></i> Remove</button>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    wrap.innerHTML = html;
    if (totalEl) totalEl.textContent = "$" + getCartTotal().toFixed(2);

    wrap.querySelectorAll(".qty-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        changeQty(btn.getAttribute("data-name"), parseInt(btn.getAttribute("data-delta"), 10));
      });
    });

    wrap.querySelectorAll(".cart-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeFromCart(btn.getAttribute("data-name"));
      });
    });
  }

  function openCart() {
    if (!document.getElementById("cartDrawer")) return;
    renderCartItems();
    document.getElementById("cartDrawer").classList.add("open");
    var ov = document.getElementById("cartOverlay");
    if (ov) ov.classList.add("open");
    document.body.style.overflow = "hidden";
    CART_DRAWER_OPEN = true;
  }

  function closeCart() {
    var drawer = document.getElementById("cartDrawer");
    if (!drawer || !CART_DRAWER_OPEN) return;
    drawer.classList.remove("open");
    var ov = document.getElementById("cartOverlay");
    if (ov) ov.classList.remove("open");
    document.body.style.overflow = "";
    CART_DRAWER_OPEN = false;
  }

  function handleCheckout() {
    if (!getCartItems().length) {
      showToast("Your cart is empty — add something first!");
      return;
    }
    closeCart();
    showToast("Order placed! Total: $" + getCartTotal().toFixed(2));
    saveCart([]);
    updateBadge();
  }

  function showToast(message) {
    var toast = document.getElementById("cartToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  /* ----------------------------------------------------------
     5. Menu page — category filter tabs + live search
     ---------------------------------------------------------- */
  function initMenuFilter() {
    var tabs = document.querySelectorAll(".filter-tabs .tab-btn");
    var cards = document.querySelectorAll(".menu-card");
    if (!tabs.length || !cards.length) return;

    function applyFilter(category, query) {
      var q = (query || "").trim().toLowerCase();

      cards.forEach(function (card) {
        var cardCat = card.getAttribute("data-category") || "all";
        var cardText = card.textContent.toLowerCase();
        var matchesCat = category === "all" || cardCat === category;
        var matchesQuery = !q || cardText.indexOf(q) !== -1;
        card.classList.toggle("hidden", !(matchesCat && matchesQuery));
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) { t.classList.remove("active"); });
        tab.classList.add("active");
        applyFilter(tab.getAttribute("data-filter") || "all", getSearchQuery());
      });
    });

    var searchInput = document.getElementById("menuSearch");
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        applyFilter(getActiveCategory(), searchInput.value);
      });
    }

    // Read ?q= from navbar search to pre-filter
    var urlParams = new URLSearchParams(window.location.search);
    var q = urlParams.get("q");
    if (q) {
      if (searchInput) searchInput.value = q;
      applyFilter(getActiveCategory(), q);
    }
  }

  function getActiveCategory() {
    var active = document.querySelector(".filter-tabs .tab-btn.active");
    return active ? active.getAttribute("data-filter") : "all";
  }

  function getSearchQuery() {
    var searchInput = document.getElementById("menuSearch");
    return searchInput ? searchInput.value : "";
  }

  /* ----------------------------------------------------------
     6. Gallery — category filter + lightbox (home page)
     ---------------------------------------------------------- */
  function initGallery() {
    var tabs = document.querySelectorAll(".gallery-filter .tab-btn");
    var items = document.querySelectorAll(".gallery-item");
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightboxImg");
    var lightboxTitle = document.getElementById("lightboxTitle");
    var lightboxClose = document.getElementById("lightboxClose");

    // Category filtering
    if (tabs.length && items.length) {
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          tabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");

          var filter = tab.getAttribute("data-filter") || "all";
          items.forEach(function (item) {
            var cat = item.getAttribute("data-category") || "all";
            item.classList.toggle("hidden", !(filter === "all" || cat === filter));
          });
        });
      });
    }

    // Lightbox
    if (lightbox && lightboxImg && lightboxTitle) {
      items.forEach(function (item) {
        item.addEventListener("click", function () {
          var img = item.querySelector("img");
          var title = item.getAttribute("data-title") || "Master Chef";
          if (img) {
            lightboxImg.src = img.src;
            lightboxImg.alt = img.alt || title;
          }
          lightboxTitle.textContent = title;
          lightbox.classList.add("open");
          document.body.style.overflow = "hidden";
        });
      });

      function closeLightbox() {
        lightbox.classList.remove("open");
        document.body.style.overflow = "";
      }

      if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeLightbox();
      });
    }
  }

  /* ----------------------------------------------------------
     7. Contact form — instant success feedback
     ---------------------------------------------------------- */
  function initContactForm() {
    var form = document.getElementById("contactForm");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.querySelector("#contactName");
      var email = form.querySelector("#contactEmail");

      // Minimal HTML5 validation is also enforced by the browser
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }

      showFormFeedback(form, "Thank you, " + (name ? name.value.trim() : "") + "! Your message has been received. We'll reply within 24 hours.", true);
      form.reset();
      form.classList.remove("was-validated");
    });
  }

  function showFormFeedback(form, message, isSuccess) {
    var fb = form.querySelector(".form-feedback");
    if (!fb) return;

    fb.textContent = message;
    fb.className = "form-feedback " + (isSuccess ? "success" : "error");
    fb.style.display = "block";
    clearTimeout(fb._timer);
    fb._timer = setTimeout(function () { fb.style.display = "none"; }, 6000);
  }

  /* ----------------------------------------------------------
     7. Reservation form — live booking summary + validation
     ---------------------------------------------------------- */
  function initReservation() {
    var form = document.getElementById("reservationForm");
    if (!form) return;

    var summaryEls = {
      date: document.getElementById("sumDate"),
      time: document.getElementById("sumTime"),
      guests: document.getElementById("sumGuests"),
      seating: document.getElementById("sumSeating"),
      requests: document.getElementById("sumRequests")
    };

    var fields = {
      date: form.querySelector("#resDate"),
      time: form.querySelector("#resTime"),
      guests: form.querySelector("#resGuests"),
      seating: form.querySelector("#resSeating"),
      requests: form.querySelector("#resRequests")
    };

    function updateSummary() {
      var now = new Date();
      var options = { weekday: "short", year: "numeric", month: "short", day: "numeric" };
      var dateLabel = fields.date && fields.date.value
        ? new Date(fields.date.value + "T00:00:00").toLocaleDateString("en-US", options)
        : "Not selected";

      if (summaryEls.date) summaryEls.date.textContent = dateLabel;
      if (summaryEls.time) summaryEls.time.textContent = fields.time && fields.time.value ? fields.time.value : "Not selected";
      if (summaryEls.guests) summaryEls.guests.textContent = fields.guests && fields.guests.value ? fields.guests.value + " guest(s)" : "Not selected";
      if (summaryEls.seating) summaryEls.seating.textContent = fields.seating && fields.seating.value ? fields.seating.value : "Not selected";
      if (summaryEls.requests) summaryEls.requests.textContent = fields.requests && fields.requests.value ? fields.requests.value : "—";

      if (summaryEls.date) summaryEls.date.style.color = "#D4AF37";
      if (summaryEls.time) summaryEls.time.style.color = "#D4AF37";
      if (summaryEls.guests) summaryEls.guests.style.color = "#D4AF37";
      if (summaryEls.seating) summaryEls.seating.style.color = "#D4AF37";
    }

    Object.keys(fields).forEach(function (key) {
      if (fields[key]) fields[key].addEventListener("input", updateSummary);
    });

    // Prevent booking dates in the past
    var today = new Date().toISOString().split("T")[0];
    if (fields.date) fields.date.min = today;

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        showFormFeedback(form, "Please fill in all required fields correctly.", false);
        return;
      }

      showFormFeedback(form, "Table booked successfully! A confirmation has been sent to your email. See you soon!", true);
      form.reset();
      form.classList.remove("was-validated");
      updateSummary();
    });
  }

  /* ----------------------------------------------------------
     8. Newsletter subscription feedback
     ---------------------------------------------------------- */
  function initNewsletter() {
    var box = document.querySelector(".newsletter-box");
    if (!box) return;

    box.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = box.querySelector("input");
      var note = document.getElementById("newsletterNote");
      if (!input) return;

      if (input.value.trim() && note) {
        note.textContent = "Subscribed! Welcome to the Master Chef family.";
        note.style.display = "block";
        input.value = "";
      }
    });
  }

  /* ----------------------------------------------------------
     9. Video Showcase — plays the clip full-width on the page
     ---------------------------------------------------------- */
  function initVideoShowcase() {
    var video        = document.getElementById("bannerVideo");
    var playBtn      = document.getElementById("playBtn");
    var watchBtn     = document.getElementById("watchStoryBtn");
    var muteBtn      = document.getElementById("muteBtn");
    var playIcon     = document.getElementById("playIcon");
    var plateStage   = document.getElementById("plateStage");
    var banner       = document.querySelector(".video-banner");

    if (!video || !playBtn) return;

    var unmuted = false;

    function setIcon(playing) {
      if (!playIcon) return;
      playIcon.className = playing ? "bi bi-pause-fill" : "bi bi-play-fill";
    }

    function refreshMuteBtn() {
      if (!muteBtn) return;
      muteBtn.classList.toggle("muted", !unmuted);
      muteBtn.innerHTML = unmuted
        ? '<i class="bi bi-volume-up"></i>'
        : '<i class="bi bi-volume-mute"></i>';
    }

    /* Toggle play/pause — plays full-width right here with sound */
    function togglePlay() {
      if (video.paused) {
        video.muted = false;
        unmuted = true;
        refreshMuteBtn();
        video.play().catch(function () {});
      } else {
        video.pause();
      }
    }

    if (playBtn)  playBtn.addEventListener("click", togglePlay);
    if (watchBtn) watchBtn.addEventListener("click", togglePlay);

    /* Keep the page state in sync with the player */
    video.addEventListener("play", function () {
      banner.classList.add("is-playing");
      setIcon(true);
      video.setAttribute("controls", "");
      /* Decorative plate only shows while the muted ambient clip runs */
      if (plateStage && video.muted) plateStage.classList.add("running");
    });

    video.addEventListener("pause", function () {
      banner.classList.remove("is-playing");
      setIcon(false);
      video.removeAttribute("controls");
      if (plateStage) plateStage.classList.remove("running");
    });

    /* Mute / unmute toggle */
    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        unmuted = !unmuted;
        video.muted = !unmuted;
        if (video.paused) video.play().catch(function () {});
        refreshMuteBtn();
      });
    }

    /* Click anywhere on the video while paused to start it */
    ["muteBtn", "playBtn", "watchStoryBtn"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", function (e) { e.stopPropagation(); });
    });
    if (banner) {
      banner.addEventListener("click", function () {
        if (video.paused) togglePlay();
      });
    }
  }
})();
