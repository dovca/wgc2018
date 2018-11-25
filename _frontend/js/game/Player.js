class Player extends PIXI.extras.AnimatedSprite {
	constructor(textures) {
		super(textures);

		this.textureStorage = {
			moving: textures,
			static: [assetStorage.getTexture('Player-static')]
		};

		this.vSpeed = 0;
		this.isInAir = false;
		this.animationSpeed = 0.1;
		this.isInvincible = false;
		this.anchor.y = 1;
		this.anchor.x = 0.5;
		this.lastX = this.x;
		this.play();
		this.stats = {};
		this.summary = {
			money: BASE_MONEY,
			injury: BASE_INJURY,
			hunger: BASE_HUNGER
		};

		const tickerHandler = () => {
			const ledges = application.getLedges();
			const isPlayerOnLedge = ledges.some((ledge) => {
				if (
					this.vSpeed >= 0
					&& ledge.x <= this.x
					&& ledge.x + ledge.length > this.x
					&& ledge.y >= this.y
					&& ledge.y <= this.y + this.vSpeed
				) {
					this.stopFalling();
					this.y = ledge.y;
					return true;
				}

				return false;
			});

			if (!isPlayerOnLedge && this.y < GROUND_HEIGHT && !this.wouldClipAtPosition(this.x, this.y + 1)) {
				this.isInAir = true;
			}

			if (this.isInAir) {
				this.vSpeed += PLAYER_GRAVITY;

				if (this.vSpeed > 0 && this.y + this.vSpeed >= GROUND_HEIGHT) {
					this.stopFalling();
					this.y = GROUND_HEIGHT;
				}

				const blockAboveBelow = this.wouldClipAtPosition(this.x, this.y + this.vSpeed);

				if (blockAboveBelow) {
					if (this.vSpeed > 0) {
						this.stopFalling();
						this.y = blockAboveBelow.y;
					} else if (this.vSpeed < 0) {
						this.vSpeed = 0;
						this.y = blockAboveBelow.y + blockAboveBelow.height + this.height;
					}
				}
			}

			this.y += this.vSpeed;
			this.lastX = this.x;

			const xMotion = application.ticker.deltaTime / application.ticker.FPS * PLAYER_MAX_HSPEED;
			const keyLeft = controls.isPressed(KEY_LEFT);
			const keyRight = controls.isPressed(KEY_RIGHT);


			if (keyLeft) {
				if (!this.wouldClipAtPosition(this.x - xMotion, this.y)) {
					this.x -= xMotion;
					this.scale.x = -1;
				}
			}

			if (keyRight) {
				if (!this.wouldClipAtPosition(this.x + xMotion, this.y)) {
					this.x += xMotion;
					this.scale.x = 1;
				}
			}

			this.x = Math.min(Math.max(0, this.x), application.worldWidth);

			if (this.lastX !== this.x) {
				const isStartingMovement = this.textures === this.textureStorage.static;

				if (isStartingMovement) {
					this.textures = this.textureStorage.moving;
					this.gotoAndPlay(0);
					this.animationSpeed = 0.1;
				}
			} else {
				this.textures = this.textureStorage.static;
			}
		};

		application.ticker.add(tickerHandler);

		controls.on('keydown', KEY_UP, () => {
			if (!this.isInAir) {
				this.jump();
			}
		});

		controls.on('keydown', KEY_ACTION_BUTTON, () => {
			if (collisionManager.get(this, Finish)) {
				window.eventHub.$emit('levelFinished');
			}
		});

		collisionManager.on(this, AirConditioning, (object) => {
			console.log('hit', object);
			const newInjuryStat = GameApp.vue.$store.state.player.stats.injury + 5 >= MAX_INJURY ?
				MAX_INJURY :
				GameApp.vue.$store.state.player.stats.injury + 5;

			GameApp.vue.$store.commit('updatePlayerStat', {
				stat: 'injury',
				value: newInjuryStat
			});
			this.summary.injury += 5;
			object.isCollisionEnabled = false;
		});

		collisionManager.on(this, Coins, (object) => {
			GameApp.vue.$store.commit('updatePlayerState', {
				state: 'money',
				value: GameApp.vue.$store.state.player.states.money + 3
			});
			this.summary.money += 3;
			object.destroy();
		});

		collisionManager.on(this, RedTurtle, (object) => {
			if (this.isInvincible) {
				return;
			}

			const newInjuryStat = GameApp.vue.$store.state.player.stats.injury + 5 >= MAX_INJURY ?
				MAX_INJURY :
				GameApp.vue.$store.state.player.stats.injury + 5;

			GameApp.vue.$store.commit('updatePlayerStat', {
				stat: 'injury',
				value: newInjuryStat
			});
			this.summary.injury += 5;
			this.isInvincible = true;
			this.injuryJump();
			setTimeout(() => {
				this.isInvincible = false;
			}, PLAYER_INVINCIBILITY_DURATION);
		});
	}

	injuryJump() {
		this.vSpeed = PLAYER_INJURY_JUMP_VSPEED;
		this.isInAir = true;
	}

	jump() {
		this.vSpeed = PLAYER_JUMP_VSPEED;
		this.isInAir = true;
	}

	wouldClipAtPosition(x, y) {
		const currentPosition = new PIXI.Point(this.position.x, this.position.y);
		this.position = new PIXI.Point(x, y);

		const bounds = this.getBounds();
		const block = application.getBlocks().find((block) => bounds.intersects(block.getBounds()));

		this.position = currentPosition;
		return block;
	}

	stopFalling() {
		this.isInAir = false;
		this.vSpeed = 0;
	}
}