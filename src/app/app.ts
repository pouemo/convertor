import { Component, OnInit, OnDestroy, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { interval, Subscription } from 'rxjs';

interface ConversionHistory {
  id: number;
  timestamp: Date;
  realRate: number;
  usedRate: number;
  inputValue: number;
  inputCurrency: string;
  outputValue: number;
  outputCurrency: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.html",
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  realRate = signal(1.1);
  rateChangePercent = signal(0);
  isEurToUsd = signal(true);
  fixedRateInput = signal('');
  isFixedRateActive = signal(false);
  outputAmount = signal('');
  history = signal<ConversionHistory[]>([]);

  currentRate = computed(() => {
    if (this.isFixedRateActive() && this.fixedRateInput()) {
      return parseFloat(this.fixedRateInput());
    }
    return this.realRate();
  });

  // Regular properties
  inputAmount = '';
  private previousRate = 1.1;
  private rateSubscription?: Subscription;
  Math = Math;
  parseFloat = parseFloat;

  constructor() {
    // Effect pour mettre à jour la conversion quand le taux change
    effect(() => {
      const rate = this.currentRate();
      if (this.inputAmount) {
        this.performConversion();
      }
    });
  }

  ngOnInit(): void {
    this.startRateUpdates();
  }

  ngOnDestroy(): void {
    this.rateSubscription?.unsubscribe();
  }

  private startRateUpdates(): void {
    // Mise à jour du taux toutes les 3 secondes
    this.rateSubscription = interval(3000).subscribe(() => {
      const change = (Math.random() - 0.5) * 0.1; // -0.05 à +0.05
      const newRate = Math.max(0.5, Math.min(2, this.realRate() + change));

      // Calculer le pourcentage de changement
      const changePercent = ((newRate - this.previousRate) / this.previousRate) * 100;
      this.rateChangePercent.set(changePercent);
      this.previousRate = newRate;

      this.realRate.set(newRate);

      // Vérifier si le taux fixe doit être désactivé
      this.checkFixedRateDeviation(newRate);
    });
  }

  private checkFixedRateDeviation(newRate: number): void {
    if (this.isFixedRateActive() && this.fixedRateInput()) {
      const fixedRate = parseFloat(this.fixedRateInput());
      const deviation = Math.abs((newRate - fixedRate) / fixedRate) * 100;

      if (deviation > 2) {
        this.isFixedRateActive.set(false);
      }
    }
  }

  onInputChange(): void {
    this.performConversion();
  }

  private performConversion(): void {
    const input = (this.inputAmount ?? '').toString().trim();

    if (!input || isNaN(Number(input))) {
      this.outputAmount.set('');
      return;
    }

    const inputNum = parseFloat(input);
    const rate = this.currentRate();
    const result = this.isEurToUsd()
      ? inputNum * rate
      : inputNum / rate;

    const roundedResult = Math.round(result * 100) / 100;
    this.outputAmount.set(roundedResult.toFixed(2));

    // Ajouter à l'historique
    this.addToHistory(inputNum, roundedResult, rate);
  }

  private addToHistory(input: number, output: number, usedRate: number): void {
    const entry: ConversionHistory = {
      id: Date.now(),
      timestamp: new Date(),
      realRate: this.realRate(),
      usedRate: usedRate,
      inputValue: input,
      inputCurrency: this.isEurToUsd() ? 'EUR' : 'USD',
      outputValue: output,
      outputCurrency: this.isEurToUsd() ? 'USD' : 'EUR'
    };

    this.history.update(h => [entry, ...h].slice(0, 5));

  }

  toggleCurrency(): void {
    // Assurer la continuité : l'ancienne sortie devient la nouvelle entrée
    this.inputAmount = this.outputAmount();
    this.isEurToUsd.update(v => !v);

    if (this.inputAmount) {
      this.performConversion();
    }
  }

  toggleFixedRate(): void {
    if (!this.isFixedRateActive() && this.fixedRateInput()) {
      this.isFixedRateActive.set(true);
    } else {
      this.isFixedRateActive.set(false);
    }
  }
}
